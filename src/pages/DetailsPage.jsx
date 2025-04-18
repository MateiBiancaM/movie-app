import { useEffect, useState } from "react";
import { useParams } from "react-router-dom"
import { Badge, Box, Button, CircularProgress, CircularProgressLabel, Container, Flex, Heading, Image, Spinner, Text, useToast } from "@chakra-ui/react";
import { fetchCredits, fetchDetails, fetchVideos, imagePath, imagePathOriginal } from "../services/api";
import { CalendarIcon, CheckCircleIcon, SmallAddIcon, TimeIcon } from "@chakra-ui/icons";
import { minutesToHours, ratingToProcentage, resolveRatingColor } from "../utils/helpers";
import VideoComponent from "../components/VideoComponent";
import { useAuth } from "../context/useAuth";
import { useFirestore } from '../services/firestore';
import { useNavigate } from "react-router-dom";



const DetailsPage = () => {
    const router = useParams();
    const { type, id } = router;
    const { user } = useAuth();
    const toast = useToast();
    const { addToWatchlist, checkIfInWatchlist, removeFromWatchlist, addToWatched, checkIfWatched, removeFromWatched } = useFirestore();

    const [details, setDetails] = useState({});
    const [cast, setCast] = useState([]);
    const [video, setVideo] = useState(null)
    const [videos, setVideos] = useState([])
    const [loading, setLoading] = useState(true);
    const [isInWatchlist, setIsInWatchlist] = useState(false);
    const [isInWatched, setIsInWatched] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [detailData, creditsData, videosData] = await Promise.all([
                    fetchDetails(type, id),
                    fetchCredits(type, id),
                    fetchVideos(type, id),
                ])

                console.log("Detail Data:", detailData);

                setDetails(detailData);
                setCast(creditsData?.cast?.slice(0, 10));

                const video = videosData?.results?.find((video) => video?.type === "Trailer");
                setVideo(video);
                const videos = videosData?.results?.filter((video) => video?.type !== "Trailer")?.slice(0, 5);
                setVideos(videos)

            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData()
    }, [type, id]);

    const handleSaveToWatchlist = async () => {
        if (!user) {
            toast({
                title: "Login to add to witchlist",
                status: 'error',
                isClosable: true
            });
            return;
        }

        const data = {
            id: details?.id,
            title: details?.title || details?.name,
            type: type,
            poster_path: details?.poster_path,
            release_date: details?.release_date || details?.first_air_date,
            vote_average: details?.vote_average,
            overview: details?.overview,
        };

        const dataId = details?.id?.toString();
        await addToWatchlist(user?.uid, dataId, data);
        const isSetToWatchlist = await checkIfInWatchlist(user?.uid, dataId);
        setIsInWatchlist(isSetToWatchlist);

    }

    const handleRemoveFromWatchlist = async () => {
        await removeFromWatchlist(user?.uid, id);
        const isSetToWatchlist = await checkIfInWatchlist(user?.uid, id);
        setIsInWatchlist(isSetToWatchlist);
    }

    const handleAddToWatched = async () => {
        if (!user) {
            toast({
                title: "Login to mark as watched",
                status: "error",
                isClosable: true,
            });
            return;
        }
        const isTV = type === 'tv';
        const data = { 
            id: details?.id, 
            title: details?.title || details?.name, 
            type: type, 
            poster_path: details?.poster_path, 
            release_date: details?.release_date || details?.first_air_date, 
            vote_average: details?.vote_average, 
            genres: details?.genres?.map(g => g.name), 
            popularity: details?.popularity, 
            overview: details?.overview,
            status: details?.status,
            ...(type === 'movie' && {
                runtime: details?.runtime
            }),
            ...(isTV && { 
                number_of_episodes: details?.number_of_episodes, 
                number_of_seasons: details?.number_of_seasons, 
                episode_run_time: details?.episode_run_time?.[0], 
            }) 
        }; 

        const dataId = details?.id?.toString();
        await addToWatched(user?.uid, dataId, data);
        const isSet = await checkIfWatched(user?.uid, dataId);
        setIsInWatched(isSet);
        
        navigate(`/watched/${data.id}/edit`);
    };

    const handleRemoveFromWatched = async () => {
        await removeFromWatched(user?.uid, id);
        const isSet = await checkIfWatched(user?.uid, id);
        setIsInWatched(isSet);
    };


    useEffect(() => {
        if (!user) {
            setIsInWatchlist(false);
            setIsInWatched(false);
            return;
        }

        checkIfInWatchlist(user?.uid, id).then((data) => {
            setIsInWatchlist(data);
        });

        checkIfWatched(user?.uid, id).then((data) => {
            setIsInWatched(data);
        });
    }, [id, user, checkIfInWatchlist, checkIfWatched]);



    if (loading) {
        return (
            <Flex justify={"center"}>
                <Spinner size={"xl"} color="red" />
            </Flex>
        )
    }

    const title = details?.title || details?.name;
    const releaseDate = type === "tv" ? details?.first_air_date : details?.release_date;

    return (
        <Box>
            <Box
                background={`linear-gradient(rgba(0, 0, 0, 0.77), rgba(0,0,0,0.77)), url(${imagePathOriginal}/${details?.backdrop_path})`}
                backgroundRepeat={"no-repeat"}
                backgroundSize={"cover"}
                backgroundPosition={"center"}
                w="100%"
                h={{ base: "auto", md: "500px" }}
                py={"2"}
                zIndex={"-1"}
                display={"flex"}
                alignItems={"center"}
            >
                <Container maxW={"container.xl"}>
                    <Flex alignItems={"center"} gap={"10"} flexDirection={{ base: "column", md: "row" }}>
                        <Image height={"450px"} borderRadius={"sm"} src={`${imagePath}/${details?.poster_path}`} />
                        <Box>
                            <Heading fontSize={"3xl"}>
                                {title}
                                {" "}
                                <Text as="span" fontWeight="normal" color={"gray.400"}>
                                    {new Date(releaseDate).getFullYear()}
                                </Text>
                            </Heading>
                            <Flex alignItems={"center"} gap={"4"} mt={"1"} mb={"5"}>
                                <Flex alignItems={"center"}>
                                    <CalendarIcon mr={"2"} color="gray.400" />
                                    <Text fontSize={"sm"}>
                                        {new Date(releaseDate).toLocaleDateString("en-GB")}
                                    </Text>
                                </Flex>
                                {type === "movie" && (
                                    <>
                                        <Box> | </Box>
                                        <Flex alignItems={"center"}>
                                            <TimeIcon mr="2" color={"gray.400"}></TimeIcon>
                                            <Text fontSize={"sm"}>{minutesToHours(details?.runtime)}</Text>
                                        </Flex>
                                    </>
                                )}
                            </Flex>



                            <Flex alignItems={"center"} gap={"4"}>
                                <CircularProgress
                                    value={ratingToProcentage(details?.vote_average)}
                                    bg={"gray.800"}
                                    borderRadius={"full"}
                                    p={"0.5"}
                                    size={"70px"}
                                    color={resolveRatingColor(details?.vote_average)}
                                    thickness={"6px"}
                                >
                                    <CircularProgressLabel fontSize={"lg"}>
                                        {ratingToProcentage(details?.vote_average)}{" "}
                                        <Box as="span" fontSize={"10px"}>%</Box>
                                    </CircularProgressLabel>
                                </CircularProgress>
                                <Text display={{ base: "None", md: "initial" }}>
                                    User Score
                                </Text>

                                {isInWatchlist ? (
                                    <Button
                                        leftIcon={<CheckCircleIcon />}
                                        colorScheme="green"
                                        variant={"outline"}
                                        onClick={handleRemoveFromWatchlist}
                                    >
                                        In watchlist
                                    </Button>

                                ) : (
                                    <Button
                                        leftIcon={<SmallAddIcon />}
                                        variant={"outline"}
                                        onClick={handleSaveToWatchlist}
                                    >
                                        Add to watchlist
                                    </Button>
                                )}

                                {isInWatched ? (
                                    <Button
                                        leftIcon={<CheckCircleIcon />}
                                        colorScheme="green"
                                        variant={"outline"}
                                        onClick={handleRemoveFromWatched}
                                    >
                                        In watched
                                    </Button>

                                ) : (
                                    <Button
                                        leftIcon={<SmallAddIcon />}
                                        variant={"outline"}
                                        onClick={handleAddToWatched}
                                    >
                                        Add to watched
                                    </Button>
                                )}



                            </Flex>
                            <Text
                                color={"gray.400"}
                                fontSize={"sm"}
                                fontStyle={"italic"}
                                my="5"
                            >
                                {details?.tagline}
                            </Text>
                            <Heading fontSize={"xl"} mb={"3"}>
                                Overview
                            </Heading>
                            <Text fontSize={"md"} mb={"3"}>
                                {details?.overview}
                            </Text>
                            <Flex mt={"6"} gap={"2"}>
                                {details?.genres?.map((genre) => (
                                    <Badge key={genre?.id} p="1">{genre?.name}</Badge>
                                ))}
                            </Flex>
                        </Box>

                    </Flex>
                </Container>
            </Box>

            <Container maxW={"container.xl"} pb="10">
                <Heading as="h2" fontSize={"md"} textTransform={"uppercase"} mt={"10"}>
                    Cast
                </Heading>
                <Flex mt="5" mb="10" overflowX={"scroll"} gap={"5"}>
                    {cast?.length === 0 && <Text>No cast found</Text>}
                    {cast && cast?.map((item) => (
                        <Box key={item?.id} minW={"150px"}>
                            <Image
                                src={`${imagePath}/${item?.profile_path}`}
                                w="100%"
                                height={"225px"}
                                objectFit={"cover"}
                                borderRadius={"sm"}></Image>
                        </Box>
                    ))}
                </Flex>

                <Heading as={"h2"} fontSize={"md"} textTransform={"uppercase"} mt={"10"} mb={"5"}>
                    Videos
                </Heading>
                <VideoComponent id={video?.key} />
                <Flex
                    mt="5"
                    mb="10"
                    overflowX={"scroll"}
                    gap={"5"}
                >
                    {videos && videos?.map((item) => (
                        <Box key={item?.id} minW={"290px"}>
                            <VideoComponent id={item?.key} small></VideoComponent>
                            <Text fontSize={"sm"} fontWeight={"bold"} mt={"2"} noOfLines={"2"}>
                                {item?.name}{" "}
                            </Text>
                        </Box>
                    ))}
                </Flex>
            </Container>
        </Box>
    )
}

export default DetailsPage