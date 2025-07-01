import { useEffect, useState } from "react";
import {
  Container,
  Flex,
  Grid,
  Heading,
  Select,
  Spinner,
  Textarea,
  Button,
  Text,
  Box,
} from "@chakra-ui/react";
import { useFirestore } from "../services/firestore";
import { useAuth } from "../context/useAuth";
import {
  fetchCredits,
  fetchMoviesBulk,
  fetchTvSeriesBulk,
  getGenreMap,
} from "../services/api";
import axios from "axios";
import CardComponent from "../components/CardComponent";

const Recommendations = () => {
  const { getWatched } = useFirestore();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("general");
  const [general, setGeneral] = useState([]);
  const [individual, setIndividual] = useState([]);

  const [emotionInput, setEmotionInput] = useState("");
  const [emotionResults, setEmotionResults] = useState([]);
  const [emotion, setEmotion] = useState("");

  useEffect(() => {
    const loadRecommendations = async () => {
      if (!user?.uid) return;

      try {
        setIsLoading(true);

        const genreMap = await getGenreMap();
        if (Object.keys(genreMap).length === 0) return;

        const watched = await getWatched(user.uid);
        const favorites = watched
          .filter((item) => item.favorite)
          .sort((a, b) => new Date(b.watchDate) - new Date(a.watchDate))
          .slice(0, 5);

        const favoritesWithTags = await Promise.all(
          favorites.map(async (item) => {
            const credits = await fetchCredits(item.type, item.id);
            const tags = [
              ...(item.description?.split(" ") || []),
              ...(item.genres?.map((g) => g.toLowerCase()) || []),
              ...(credits.cast?.slice(0, 3).map((a) => a.name) || []),
              ...(credits.crew?.filter(p => p.job === "Director").map((p) => p.job + " " + p.name) || []),
            ].join(" ");

            return {
              id: item.id,
              title: item.title || item.name,
              tags,
              poster_path: item.poster_path,
              release_date: item.release_date || item.first_air_date,
              vote_average: item.vote_average,
              type: item.type || (item.name ? "tv" : "movie")
            };
          })
        );

        const [moviesRes, seriesRes] = await Promise.all([
          fetchMoviesBulk(6),
          fetchTvSeriesBulk(6),
        ]);

        const discoverItems = [...moviesRes.results, ...seriesRes.results];

        const discoverWithTags = await Promise.all(
          discoverItems.map(async (item) => {
            const type = item.media_type || (item.name ? "tv" : "movie");
            const credits = await fetchCredits(type, item.id);
            const tags = [
              ...(item.overview?.split(" ") || []),
              ...(item.genre_ids?.map((id) => genreMap[id]?.toLowerCase()) || []),
              ...(credits.cast?.slice(0, 3).map((a) => a.name) || []),
              ...(credits.crew?.filter(p => p.job === "Director").map((p) => p.job + " " + p.name) || []),
            ].join(" ");

            return {
              id: item.id,
              title: item.title || item.name,
              tags,
              poster_path: item.poster_path,
              release_date: item.release_date || item.first_air_date,
              vote_average: item.vote_average,
              type: item.type || (item.name ? "tv" : "movie")
            };
          })
        );

        const cleanedFavorites = favoritesWithTags.filter(
          (m) =>
            m.id &&
            m.title &&
            m.tags &&
            m.poster_path &&
            m.release_date &&
            typeof m.vote_average === "number"
        );

        const cleanedDiscover = discoverWithTags.filter(
          (m) =>
            m.id &&
            m.title &&
            m.tags &&
            m.poster_path &&
            m.release_date &&
            typeof m.vote_average === "number"
        );

        const res = await axios.post("http://localhost:8001/recommend", {
          favorites: cleanedFavorites,
          discover: cleanedDiscover,
        });

        setGeneral(res.data.general);
        setIndividual(res.data.individual);
      } catch (err) {
        console.error("Eroare la recomandări:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecommendations();
  }, [user]);

  const handleEmotionRecommend = async () => {
    if (!emotionInput.trim()) return;
    setIsLoading(true);
    setEmotionResults([]);
    try {
     const res = await axios.post("http://localhost:8001/emotion-recommend", {
  text: emotionInput,
  discover: general.concat(...individual.flatMap((i) => i.suggestions)),
});

// Elimină duplicatele pe bază de id + type
const uniqueResults = [];
const seenKeys = new Set();
for (const item of res.data.recommended) {
  const key = `${item.id}-${item.type}`;
  if (!seenKeys.has(key)) {
    seenKeys.add(key);
    uniqueResults.push(item);
  }
}

setEmotion(res.data.emotion);
setEmotionResults(uniqueResults);
    } catch (err) {
      console.error("Eroare recomandări emoționale:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxW="container.xl">
      <Flex alignItems="baseline" gap="4" my="10">
        <Heading as="h2" fontSize="md" textTransform="uppercase">
          Recommendations
        </Heading>
        <Select
          w="270px"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="general">General Recommendations</option>
          <option value="individual">Individual Recommendations</option>
          <option value="emotion">Emotion-Based Recommendations</option>
        </Select>
      </Flex>

      {isLoading ? (
        <Flex justify="center" mt="10">
          <Spinner size="xl" color="green.400" />
        </Flex>
      ) : (
        <>
          {filter === "general" && (
            <>
              <Heading as="h3" size="md" mb="6">
                General recommendations (Top 20)
              </Heading>
              <Grid
                templateColumns={{
                  base: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(4, 1fr)",
                  lg: "repeat(5, 1fr)",
                }}
                gap={4}
              >
                {general.map((item) => (
                  <CardComponent
                    key={`general-${item.type}-${item.id}`}
                    item={item}
                    type={item.type}
                  />
                ))}
              </Grid>
            </>
          )}

          {filter === "individual" &&
            individual.map((group, index) => (
              <div key={index}>
                <Heading as="h3" size="sm" my={4}>
                  Because you liked <strong>{group.based_on}</strong>, we recommend:
                </Heading>
                <Grid
                  templateColumns={{
                    base: "1fr",
                    sm: "repeat(2, 1fr)",
                    md: "repeat(4, 1fr)",
                    lg: "repeat(5, 1fr)",
                  }}
                  gap={4}
                  mb={10}
                >
                  {group.suggestions.map((item) => (
                    <CardComponent
                      key={`individual-${group.based_on}-${item.type}-${item.id}`}
                      item={item}
                      type={item.type}
                    />
                  ))}
                </Grid>
              </div>
            ))}

          {filter === "emotion" && (
            <Box my={10}>
              <Heading as="h3" size="md" mb={4}>
                Emotion-based Recommendations
              </Heading>
              <Textarea
                placeholder="Describe how you feel or what vibe you're looking for..."
                value={emotionInput}
                onChange={(e) => setEmotionInput(e.target.value)}
                rows={4}
                mb={4}
              />
              <Button onClick={handleEmotionRecommend} colorScheme="teal" mb={6}>
                Get Recommendations
              </Button>

              {emotionResults.length > 0 && (
                <>
                  <Text fontSize="md" mb={2}>
                    <strong>Detected emotion:</strong> {emotion}
                  </Text>
                  <Grid
                    templateColumns={{
                      base: "1fr",
                      sm: "repeat(2, 1fr)",
                      md: "repeat(4, 1fr)",
                      lg: "repeat(5, 1fr)",
                    }}
                    gap={4}
                  >
                    {emotionResults.map((item) => (
                      <CardComponent
                        key={`emotion-${item.type}-${item.id}`}
                        item={item}
                        type={item.type}
                      />
                    ))}
                  </Grid>
                </>
              )}
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default Recommendations;
