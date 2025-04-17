import { useState, useEffect } from "react";
import { useFirestore } from "../services/firestore";
import { useAuth } from "../context/useAuth";
import { Container, Flex, Grid, Heading, Select, Spinner } from "@chakra-ui/react";
import WatchedCard from "../components/WatchedCard";

const Watched = () => {
  const { getWatched } = useFirestore();
  const { user } = useAuth();
  const [watched, setWatched] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");


  useEffect(() => {
    if (user?.uid) {
      getWatched(user.uid)
        .then(setWatched)
        .catch((err) => console.log(err))
        .finally(() => setIsLoading(false));
    }
  }, [user?.uid, getWatched]);
  
  const filteredWatched =
  filter === "favorite"
    ? watched.filter((item) => item.favorite)
    : watched;

  return (
    <Container maxW="container.xl">
      <Flex alignItems="baseline" gap="4" my="10">
        <Heading as="h2" fontSize="md" textTransform="uppercase">
          Watched
        </Heading>
        <Select
          w="130px"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="favorite">Favorites</option>
        </Select>
      </Flex>

      {isLoading && (
        <Flex justify="center" mt="10">
          <Spinner size="xl" color="green.400" />
        </Flex>
      )}

      {!isLoading && filteredWatched.length === 0 && (
        <Flex justify="center" mt="10">
          <Heading as="h2" fontSize="md" textTransform="uppercase">
            {filter === "favorite"
              ? "No favorites yet."
              : "No watched movies yet."}
          </Heading>
        </Flex>
      )}

{!isLoading && filteredWatched.length > 0 && (
        <Grid templateColumns={{ base: "1fr" }} gap="4">
          {filteredWatched.map((item) => (
            <WatchedCard
              key={item.id}
              item={item}
              type={item.type}
              setWatched={setWatched}
            />
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default Watched;
