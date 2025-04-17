import {
    Box,
    Flex,
    Heading,
    IconButton,
    Image,
    Text,
    Tooltip,
    Button,
} from "@chakra-ui/react";
import { Link, useNavigate } from "react-router-dom";
import { imagePath } from "../services/api";
import { useFirestore } from "../services/firestore";
import { useAuth } from "../context/useAuth";
import {
    CloseIcon,
    StarIcon,
} from "@chakra-ui/icons";

const WatchedCard = ({ type, item, setWatched }) => {
    const { removeFromWatched } = useFirestore();
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleRemoveClick = (event) => {
        event.stopPropagation();
        removeFromWatched(user?.uid, item.id).then(() => {
            setWatched((prev) => prev.filter((el) => el.id !== item.id));
        });
    };

    const handleEditClick = (event) => {
        event.stopPropagation();
        navigate(`/watched/${item.id}/edit`);
    };

    const handleCardClick = () => {
        navigate(`/${type}/${item.id}`);
    };

    return (
        <Flex 
            gap="4" 
            onClick={handleCardClick}
            cursor="pointer"
            _hover={{
                transform: "scale(1.01)",
                transition: "transform 0.2s"
            }}
        >
            <Box position={"relative"} w={"150px"}>
                <Image
                    src={`${imagePath}/${item.poster_path}`}
                    alt={item.title}
                    height={"200px"}
                    minW={"150px"}
                    objectFit={"cover"}
                />
                <Tooltip label="Remove from watched">
                    <IconButton
                        aria-label="Remove from watched"
                        icon={<CloseIcon />}
                        size={"sm"}
                        colorScheme="red"
                        position={"absolute"}
                        zIndex={"999"}
                        top="2px"
                        left={"2px"}
                        onClick={handleRemoveClick}
                    />
                </Tooltip>
            </Box>

            <Box>
                <Heading fontSize={{ base: 'xl', md: "2xl" }} noOfLines={1}>
                    {item?.title || item?.name}
                </Heading>
                <Heading fontSize={"sm"} color={"green.200"} mt="2">
                    {new Date(
                        item?.release_date || item?.first_air_date
                    ).getFullYear() || "N/A"}
                </Heading>
                <Flex alignItems={"center"} gap={2} mt="4">
                    <StarIcon fontSize={"small"} />
                    <Text textAlign={"center"} fontSize="small">
                        {item?.vote_average?.toFixed(1)}
                    </Text>
                </Flex>
                <Text mt="4" fontSize={{ base: "xs", md: "sm" }} noOfLines={5}>
                    {item?.overview}
                </Text>
                <Box mt="4">
                    <Button
                        size="sm"
                        colorScheme="purple"
                        onClick={handleEditClick}
                        leftIcon={<StarIcon />}
                    >
                        Review It
                    </Button>
                </Box>
            </Box>
        </Flex>
    );
};

export default WatchedCard;