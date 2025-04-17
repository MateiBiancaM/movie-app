import {
  Box,
  Heading,
  Button,
  IconButton,
  HStack,
  VStack,
  Input,
  Text,
  Center,
  Image,
} from "@chakra-ui/react";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../context/useAuth";
import { db } from "../services/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { StarIcon, AddIcon, DeleteIcon } from "@chakra-ui/icons";
import { imagePath } from "../services/api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";


const WatchedEdit = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);

  const [rating, setRating] = useState(0);
  const [notesList, setNotesList] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [quotesList, setQuotesList] = useState([]);
  const [newQuote, setNewQuote] = useState("");
  const [favorite, setFavorite] = useState(false);
  const [watchDate, setWatchDate] = useState(null);


  useEffect(() => {
    if (!user) return;

    const fetchMovie = async () => {
      const ref = doc(db, "users", user.uid, "watched", id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setMovie(data);
        setRating(data.rating || 0);
        setNotesList(data.notes || []);
        setQuotesList(data.quotes || []);
        setFavorite(data.favorite || false);
        setWatchDate(data.watchDate ? new Date(data.watchDate) : null);

      }
    };

    fetchMovie();
  }, [user, id]);

  const handleAddNote = () => {
    if (newNote.trim()) {
      setNotesList([...notesList, newNote.trim()]);
      setNewNote("");
    }
  };

  const handleRemoveNote = (index) => {
    setNotesList(notesList.filter((_, i) => i !== index));
  };

  const handleAddQuote = () => {
    if (newQuote.trim()) {
      setQuotesList([...quotesList, newQuote.trim()]);
      setNewQuote("");
    }
  };

  const handleRemoveQuote = (index) => {
    setQuotesList(quotesList.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const ref = doc(db, "users", user.uid, "watched", id);
    const updatedMovie = {
      ...movie,
      rating,
      notes: notesList,
      quotes: quotesList,
      favorite,
      watchDate: watchDate?.toISOString().split("T")[0],
    };

    await setDoc(ref, updatedMovie, { merge: true });
    navigate("/watched");
  };

  if (!movie) return <Box p="4">Loading...</Box>;

  return (
    <Box p="6" maxW="600px" mx="auto">
      <Center flexDirection="column" mb="8">
        <Image
          src={`${imagePath}/${movie.poster_path}`}
          alt={movie.title || movie.name}
          height="300px"
          objectFit="cover"
          borderRadius="lg"
          mb="4"
        />
        <Heading
          size="lg"
          textAlign="center"
          color="green.400"
          fontWeight="bold"
        >
          {movie.title || movie.name}
        </Heading>
      </Center>

      {/* Rating Section */}
      <Box mb="6">
        <Heading size="md" mb="3">Rate and mark as favorite</Heading>
        <HStack spacing={4} alignItems="center">
          <HStack spacing={1}>
            {[1, 2, 3, 4, 5].map((star) => (
              <IconButton
                key={star}
                icon={<StarIcon />}
                variant="ghost"
                color={star <= rating ? "yellow.400" : "gray.300"}
                onClick={() => setRating(star)}
                aria-label={`Rate ${star} stars`}
                _hover={{
                  color: "yellow.400"
                }}
              />
            ))}
          </HStack>
          <Text color="gray.500">({rating}/5)</Text>
          <Box
            as="button"
            onClick={() => setFavorite(!favorite)}
            color={favorite ? "red.400" : "gray.300"}
            _hover={{ color: "red.400" }}
            fontSize="24px"
            transition="color 0.2s"
          >
            {favorite ? "❤️" : "🤍"}
          </Box>
        </HStack>
      </Box>

      {/* Notes Section */}
      <Box mb="6">
        <Heading size="md" mb="3">Add personal notes</Heading>
        <HStack mb="2">
          <Input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddNote();
              }
            }}
          />
          <IconButton
            icon={<AddIcon />}
            onClick={handleAddNote}
            colorScheme="green"
            aria-label="Add note"
          />
        </HStack>

        <VStack align="stretch" spacing={2} mt="2">
          {notesList.map((note, index) => (
            <HStack key={index} p="2" bg="gray.700" borderRadius="md">
              <Box flex="1">{note}</Box>
              <IconButton
                icon={<DeleteIcon />}
                size="sm"
                colorScheme="red"
                variant="ghost"
                onClick={() => handleRemoveNote(index)}
                aria-label="Remove note"
              />
            </HStack>
          ))}
        </VStack>
      </Box>

      {/* Quotes Section */}
      <Box mb="6">
        <Heading size="md" mb="3">Add favorite lines</Heading>
        <HStack mb="2">
          <Input
            value={newQuote}
            onChange={(e) => setNewQuote(e.target.value)}
            placeholder="Add a favorite line"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddQuote();
              }
            }}
          />
          <IconButton
            icon={<AddIcon />}
            onClick={handleAddQuote}
            colorScheme="green"
            aria-label="Add quote"
          />
        </HStack>

        <VStack align="stretch" spacing={2} mt="2">
          {quotesList.map((quote, index) => (
            <HStack key={index} p="2" bg="gray.700" borderRadius="md">
              <Box flex="1">{quote}</Box>
              <IconButton
                icon={<DeleteIcon />}
                size="sm"
                colorScheme="red"
                variant="ghost"
                onClick={() => handleRemoveQuote(index)}
                aria-label="Remove quote"
              />
            </HStack>
          ))}
        </VStack>
      </Box>
      <Box>
        <Heading size="md" mb="3">Select watch date</Heading>
        <DatePicker
          selected={watchDate}
          onChange={(date) => setWatchDate(date)}
          dateFormat="dd.MM.yyyy"
          placeholderText="Choose a date"
          maxDate={new Date()}
          calendarStartDay={1} // Monday
          customInput={
            <Input
              bg="gray.700"
              color="white"
              _placeholder={{ color: "gray.400" }}
            />
          }
        />
      </Box>


      <Button mt="6" colorScheme="green" onClick={handleSave}>
        Save
      </Button>
    </Box>
  );
};

export default WatchedEdit;
