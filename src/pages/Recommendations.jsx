import { useEffect, useState } from "react";
import { Container, Flex, Grid, Heading, Skeleton, Text } from "@chakra-ui/react";
import { useAuth } from "../context/useAuth";
import { useFirestore } from "../services/firestore";
import { fetchMovies, fetchTvSeries, getGenreMap } from "../services/api";
import axios from "axios";
import CardComponent from "../components/CardComponent";

const Recommendations = () => {
  const { user } = useAuth();
  const { getWatched } = useFirestore();

  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!user?.uid) return;
      setIsLoading(true);

      try {
        const watched = await getWatched(user.uid);
        console.log("Watched from Firestore:", watched);

        const genreMap = await getGenreMap();
        console.log("Genre map:", genreMap);

        const fetchPages = async (fetchFn) => {
          const results = [];
          for (let page = 1; page <= 5; page++) {
            const res = await fetchFn(page, "popularity.desc");
            results.push(...(res?.results || []));
          }
          return results;
        };

        const rawMovies = await fetchPages(fetchMovies);
        const rawSeries = await fetchPages(fetchTvSeries);

        console.log("Fetched Movies:", rawMovies);
        console.log("Fetched Series:", rawSeries);

        const sanitize = (item) => ({
          id: item.id,
          title: item.title || item.name || "Untitled",
          genres: item.genre_ids?.map((id) => genreMap[id]) || [],
          description: item.overview || "",
          poster_path: item.poster_path || "",
          vote_average: item.vote_average || 0,
          media_type: item.media_type || (item.title ? "movie" : "tv"),
        });

        const allMovies = [...rawMovies, ...rawSeries].map(sanitize);
        console.log("Sanitized allMovies:", allMovies);

        const watchedSanitized = watched.map((item) => ({
          id: item.id,
          title: item.title || item.name || "Untitled",
          genres: item.genres || [],
          description: item.overview || "",
          poster_path: item.poster_path || "",
          vote_average: item.vote_average || 0,
          media_type: item.type || "movie",
        }));

        console.log("Sanitized watched:", watchedSanitized);

        const response = await axios.post("http://127.0.0.1:8001/recommend", {
          watched: watchedSanitized,
          all_movies: allMovies,
        });

        console.log("Recommendations Response:", response.data);

        setRecommendations(
          response.data.filter(
            (item, index, self) => index === self.findIndex((i) => i.id === item.id)
          )
        );

      } catch (err) {
        console.error("Failed to fetch recommendations:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [user?.uid]);

  return (
    <Container maxW="container.xl">
      <Flex alignItems="baseline" gap="4" my="10">
        <Heading as="h2" fontSize="md" textTransform="uppercase">
          Recommendations
        </Heading>
      </Flex>

      <Grid
        templateColumns={{
          base: "1fr",
          sm: "repeat(2, 1fr)",
          md: "repeat(4, 1fr)",
          lg: "repeat(5, 1fr)",
        }}
        gap="4"
      >
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => <Skeleton height="300px" key={i} />)
          : recommendations.length === 0
          ? <Text>No recommendations found.</Text>
          : recommendations.map((item) => (
              <CardComponent
                key={`${item.id}-${item.media_type}`}
                item={item}
                type={item.media_type}
                similarity={item.similarity} 
              />
            ))}
      </Grid>
    </Container>
  );
};

export default Recommendations;
