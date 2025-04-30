import { useEffect, useState } from "react";
import { Container, Flex, Grid, Heading, Skeleton, Text } from "@chakra-ui/react";
import { useAuth } from "../context/useAuth";
import { useFirestore } from "../services/firestore";
import {
  fetchMovies,
  fetchTvSeries,
  getGenreMap,
  fetchCredits
} from "../services/api";
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
        const genreMap = await getGenreMap();

        const fetchAllPages = async (fetchFn, sortBy) => {
          const results = [];
          const maxPages = 3; // Redus pt. performanță când adaugi credits
          for (let page = 1; page <= maxPages; page++) {
            const res = await fetchFn(page, sortBy);
            results.push(...(res?.results || []));
          }
          return results;
        };

        const [popularMovies, topRatedMovies] = await Promise.all([
          fetchAllPages(fetchMovies, "popularity.desc"),
          fetchAllPages(fetchTvSeries, "popularity.desc"),
        ]);

        const allRawItems = [...popularMovies, ...topRatedMovies];

        const uniqueItems = allRawItems.filter(
          (item, index, self) => index === self.findIndex((i) => i.id === item.id)
        );

        // ✅ Extragem credits pentru primele 100 filme/seriale
        const topItems = uniqueItems.slice(0, 100);

        const sanitize = async (item) => {
          const credits = await fetchCredits(item.media_type || (item.title ? "movie" : "tv"), item.id);

          const topCast = credits?.cast?.slice(0, 3)?.map(actor =>
            actor?.name?.replace(/\s/g, "") || ""
          ) || [];

          const directors = credits?.crew
            ?.filter(person => person.job === "Director")
            ?.slice(0, 1)
            ?.map(director => director?.name?.replace(/\s/g, "")) || [];

          return {
            id: item.id,
            title: item.title || item.name || "Untitled",
            overview: item.overview || "",
            genres: item.genre_ids?.map(id => genreMap[id]) || [],
            cast: topCast,
            crew: directors,
            poster_path: item.poster_path || "",
            vote_average: item.vote_average || 0,
            media_type: item.media_type || (item.title ? "movie" : "tv"),
          };
        };

        const allMovies = await Promise.all(topItems.map(sanitize));

        const watchedSanitized = watched.map((item) => ({
          id: item.id,
          title: item.title || item.name || "Untitled",
          overview: item.description || item.overview || "",
          genres: item.genres || [],
          cast: item.cast || [],
          crew: item.crew || [],
          poster_path: item.poster_path || "",
          vote_average: item.vote_average || 0,
          media_type: item.media_type || item.type || "movie",
          rating: item.rating || 5,
          is_favorite: item.is_favorite || false,
        }));

        const response = await axios.post("http://127.0.0.1:8001/recommend", {
          watched: watchedSanitized,
          all_movies: allMovies,
        });

        
        console.log("🎬 Watched sanitized:", watchedSanitized);
        console.log("📦 All movies with credits:", allMovies);

        setRecommendations(response.data);

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
