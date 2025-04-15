import { useToast } from '@chakra-ui/react';
import { db } from '../services/firebase';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { useCallback } from 'react';

export const useFirestore = () => {
    const toast = useToast();

    // --- WATCHLIST FUNCTIONS ---

    const addDocument = async (collectionName, data) => {
        // Add a new document with a generated id.
        const docRef = await addDoc(collection(db, collectionName), data);
        console.log("Document written with ID: ", docRef.id);
    };

    const addToWatchlist = async (userId, dataId, data) => {
        try {
            if (await checkIfInWatchlist(userId, dataId)) {
                toast({
                    title: "Error",
                    description: "This item is already in your watchlist.",
                    status: 'error',
                    duration: 9000,
                    isClosable: true
                });
                return false;
            }
            await setDoc(doc(db, "users", userId, "watchlist", dataId), data);
            toast({
                title: "Success!",
                description: "Added to watchlist.",
                status: 'success',
                isClosable: true
            });
        } catch (error) {
            console.log(error, "Error adding document");
            toast({
                title: "Error",
                description: "An error occured.",
                status: 'error',
                isClosable: true
            });
        }
    }

    const checkIfInWatchlist = async (userId, dataId) => {
        const docRef = doc(db, "users", userId?.toString(), "watchlist", dataId?.toString());
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return true;
        } else {
            return false;
        }
    }

    const removeFromWatchlist = async (userId, dataId) => {
        try {
            await deleteDoc(
                doc(db, "users", userId?.toString(), "watchlist", dataId?.toString())
            );
            toast({
                title: "Success!",
                description: "Removed from watchlist.",
                status: 'success',
                isClosable: true
            });
        } catch (error) {
            console.log(error, "Error while deleting document");
            toast({
                title: "Error",
                description: "An error occured.",
                status: 'error',
                isClosable: true
            });
        }
    };

    const getWatchlist = useCallback(async (userId) => {
        const querySnapshot = await getDocs(collection(db, "users", userId, "watchlist"));
        const data = querySnapshot.docs.map((doc) => ({
            ...doc.data(),
        }));
        return data;
    }, []);

    // --- WATCHED FUNCTIONS ---

    const addToWatched = async (userId, dataId, data) => {
        try {
            await setDoc(doc(db, "users", userId, "watched", dataId), {
                ...data,
                watchedAt: new Date().toISOString()
            });
            toast({
                title: "Added to Watched!",
                status: "success",
                isClosable: true
            });
        } catch (error) {
            console.error("Error adding to watched:", error);
            toast({
                title: "Error",
                description: "Could not add to watched.",
                status: "error",
                isClosable: true
            });
        }
    };

    const removeFromWatched = async (userId, dataId) => {
        try {
            await deleteDoc(
                doc(db, "users", userId?.toString(), "watched", dataId?.toString())
            );
            toast({
                title: "Success!",
                description: "Removed from watched.",
                status: 'success',
                isClosable: true
            });
        } catch (error) {
            console.log(error, "Error while deleting document");
            toast({
                title: "Error",
                description: "An error occured.",
                status: 'error',
                isClosable: true
            });
        }
    };

    const getWatched = useCallback(async (userId) => {
        const querySnapshot = await getDocs(collection(db, "users", userId, "watched"));
        return querySnapshot.docs.map((doc) => doc.data());
    }, []);

    const checkIfWatched = async (userId, dataId) => {
        const docRef = doc(db, "users", userId?.toString(), "watched", dataId?.toString());
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return true;
        } else {
            return false;
        }
    };



    return {
        addDocument,
        addToWatchlist,
        checkIfInWatchlist,
        removeFromWatchlist,
        getWatchlist,

        addToWatched,
        removeFromWatched,
        getWatched,
        checkIfWatched,
    };
};

