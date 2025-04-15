import { useState, useEffect } from "react";
import { useFirestore } from "../services/firestore";
import { useAuth } from "../context/useAuth";
import { Container, Flex, Grid, Heading, Spinner } from "@chakra-ui/react";
import WatchedCard from "../components/WatchedCard";

const Watched = () => {
  const { getWatched } = useFirestore();
  const { user } = useAuth();
  const [watched, setWatched] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      getWatched(user.uid)
        .then(setWatched)
        .catch((err) => console.log(err))
        .finally(() => setIsLoading(false));
    }
  }, [user?.uid, getWatched]);

  return (
    <Container maxW="container.xl">
      <Flex alignItems="baseline" gap="4" my="10">
        <Heading as="h2" fontSize="md" textTransform="uppercase">
          Watched
        </Heading>
      </Flex>

      {isLoading && (
        <Flex justify="center" mt="10">
          <Spinner size="xl" color="green.400" />
        </Flex>
      )}

      {!isLoading && watched.length === 0 && (
        <Flex justify="center" mt="10">
          <Heading as="h2" fontSize="md" textTransform="uppercase">
            No watched movies yet.
          </Heading>
        </Flex>
      )}

      {!isLoading && watched.length > 0 && (
        <Grid templateColumns={{ base: "1fr"}} gap="4">
          {watched.map((item) => (
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
