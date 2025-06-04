import { useEffect, useState } from "react";
import { Container, Flex, Grid, Heading, Box, Text, CircularProgress, CircularProgressLabel, Spinner } from "@chakra-ui/react";
import { useAuth } from "../context/useAuth";
import { useFirestore } from "../services/firestore";
import { TimeIcon } from "@chakra-ui/icons";
import { minutesToDaysHours } from "../utils/helpers";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer} from 'recharts';

const ConsumptionHabits = () => {
    const { user } = useAuth();
    const { getWatched } = useFirestore();
    const [watchedData, setWatchedData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalWatchTime: 0,
        movieWatchTime: 0,
        showWatchTime: 0,
        favoriteGenres: [],
        allGenres: [],
        averageRating: 0,
        totalItems: 0,
        moviesCount: 0,
        showsCount: 0,
        favoriteCount: 0
    });
    const [weekdayStats, setWeekdayStats] = useState([
        { name: 'Mon', count: 0 },
        { name: 'Tue', count: 0 },
        { name: 'Wed', count: 0 },
        { name: 'Thu', count: 0 },
        { name: 'Fri', count: 0 },
        { name: 'Sat', count: 0 },
        { name: 'Sun', count: 0 }
    ]);

    useEffect(() => {
        const fetchWatchedData = async () => {
            if (!user?.uid) return;
            
            try {
                const data = await getWatched(user.uid);
                setWatchedData(data);
                
                const statistics = {
                    totalWatchTime: 0,
                    movieWatchTime: 0,
                    showWatchTime: 0,
                    favoriteGenres: [],
                    allGenres: [],
                    averageRating: 0,
                    totalItems: data.length,
                    moviesCount: data.filter(item => item.type === 'movie').length,
                    showsCount: data.filter(item => item.type === 'tv').length,
                    favoriteCount: data.filter(item => item.favorite).length
                };

                const genreCount = {};

                data.forEach(item => {
                    if (item.type === 'movie') {
                        const movieTime = item.runtime || 0;
                        statistics.movieWatchTime += movieTime;
                        statistics.totalWatchTime += movieTime;
                    } else if (item.type === 'tv') {
                        const episodeRunTime = item.episode_run_time || 0;
                        const numberOfEpisodes = item.number_of_episodes || 0;
                        const showTime = episodeRunTime * numberOfEpisodes;
                        statistics.showWatchTime += showTime;
                        statistics.totalWatchTime += showTime;
                    }

                    if (item.genres && Array.isArray(item.genres)) {
                        item.genres.forEach(genre => {
                            genreCount[genre] = (genreCount[genre] || 0) + 1;
                        });
                    }
                });

                const sortedGenres = Object.entries(genreCount)
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, count]) => ({ name, count }));

                statistics.favoriteGenres = sortedGenres.slice(0, 3);
                statistics.allGenres = sortedGenres;

                const totalRating = data.reduce((acc, item) => acc + (item.rating || 0), 0);
                statistics.averageRating = data.length ? totalRating / data.length : 0;

                const weekdayCounts = [0, 0, 0, 0, 0, 0, 0]; // start with Sunday
                data.forEach(item => {
                    if (item.type === 'movie' && item.watchDate) {
                        const date = new Date(item.watchDate);
                        let dayOfWeek = date.getDay();
                        weekdayCounts[dayOfWeek]++;
                    }
                });

                setWeekdayStats([
                    { name: 'Mon', count: weekdayCounts[0] },
                    { name: 'Tue', count: weekdayCounts[1] },
                    { name: 'Wed', count: weekdayCounts[2] },
                    { name: 'Thu', count: weekdayCounts[3] },
                    { name: 'Fri', count: weekdayCounts[4] },
                    { name: 'Sat', count: weekdayCounts[5] },
                    { name: 'Sun', count: weekdayCounts[6] }
                ]);

                setStats(statistics);
            } catch (error) {
                console.error("Error fetching watched data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchWatchedData();
    }, [user?.uid, getWatched]);

    if (loading) {
        return (
            <Flex justify="center" mt="10">
                <Spinner size="xl" color="red" />
            </Flex>
        );
    }

    return (
        <Container maxW="container.xl">
            <Flex alignItems="baseline" gap="4" my="10">
                <Heading as="h2" fontSize="md" textTransform="uppercase">
                    Viewing Habits
                </Heading>
            </Flex>

            {/* Watch Time Statistics */}
            <Box bg="gray.800" p="6" borderRadius="lg" mb="6">
                <Heading size="md" mb="4">
                    <TimeIcon mr="2" />
                    Total Watch Time
                </Heading>
                <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap="6">
                    <Box>
                        <Text color="gray.400" mb="2">Movies</Text>
                        <Text fontSize="2xl" fontWeight="bold" color="blue.400">
                            {minutesToDaysHours(stats.movieWatchTime)}
                        </Text>
                    </Box>
                    <Box>
                        <Text color="gray.400" mb="2">TV Shows</Text>
                        <Text fontSize="2xl" fontWeight="bold" color="purple.400">
                            {minutesToDaysHours(stats.showWatchTime)}
                        </Text>
                    </Box>
                    <Box>
                        <Text color="gray.400" mb="2">Total Time</Text>
                        <Text fontSize="2xl" fontWeight="bold" color="green.400">
                            {minutesToDaysHours(stats.totalWatchTime)}
                        </Text>
                    </Box>
                </Grid>
            </Box>

            {/* Overview Statistics */}
            <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap="6" mb="10">
                <Box bg="gray.800" p="6" borderRadius="lg">
                    <Heading size="sm" mb="4">Total Watched</Heading>
                    <Text fontSize="2xl" fontWeight="bold" color="green.400">
                        {stats.totalItems}
                    </Text>
                </Box>

                <Box bg="gray.800" p="6" borderRadius="lg">
                    <Heading size="sm" mb="4">Movies vs Shows</Heading>
                    <Flex justify="space-around">
                        <Box textAlign="center">
                            <Text fontSize="2xl" fontWeight="bold" color="blue.400">
                                {stats.moviesCount}
                            </Text>
                            <Text fontSize="sm">Movies</Text>
                        </Box>
                        <Box textAlign="center">
                            <Text fontSize="2xl" fontWeight="bold" color="purple.400">
                                {stats.showsCount}
                            </Text>
                            <Text fontSize="sm">Shows</Text>
                        </Box>
                    </Flex>
                </Box>

                <Box bg="gray.800" p="6" borderRadius="lg">
                    <Heading size="sm" mb="4">Average Rating</Heading>
                    <CircularProgress value={stats.averageRating * 20} color="yellow.400" size="80px">
                        <CircularProgressLabel>
                            {stats.averageRating.toFixed(1)}
                        </CircularProgressLabel>
                    </CircularProgress>
                </Box>

                <Box bg="gray.800" p="6" borderRadius="lg">
                    <Heading size="sm" mb="4">Favorites</Heading>
                    <Text fontSize="2xl" fontWeight="bold" color="red.400">
                        {stats.favoriteCount}
                    </Text>
                </Box>
            </Grid>

            {/* Top 3 Genres */}
            <Box bg="gray.800" p="6" borderRadius="lg" mb="6">
                <Heading size="md" mb="4">Top 3 Genres</Heading>
                {stats.favoriteGenres.length === 0 ? (
                    <Text color="gray.400">No info.</Text>
                ) : (
                    <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap="6">
                        {stats.favoriteGenres.map((genre, index) => (
                            <Box key={index} p="4" bg="gray.700" borderRadius="md" textAlign="center">
                                <Text fontSize="lg" fontWeight="bold" color="cyan.300">
                                    {genre.name}
                                </Text>
                                <Text color="gray.400">{genre.count} titles</Text>
                            </Box>
                        ))}
                    </Grid>
                )}
            </Box>

            {/* Movie Watch Days Distribution Chart */}
            <Box bg="gray.800" p="6" borderRadius="lg" mb="6">
                <Heading size="md" mb="4">Movie Watch Days Distribution</Heading>
                <Text color="gray.400" mb="4">Number of movies watched on each day of the week</Text>
                <Box height="300px">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weekdayStats}>
                            <XAxis dataKey="name" stroke="#fff" tick={{ fill: '#fff' }} />
                            <YAxis stroke="#fff" tick={{ fill: '#fff' }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#2D3748', border: 'none', borderRadius: '8px', color: '#fff' }}
                                formatter={(value) => [`${value} movies`, 'Count']}
                                labelFormatter={(label) => `${label}day`}
                            />
                            <Bar dataKey="count" fill="#9F3CFA" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Box>
            </Box>

            {watchedData.length === 0 && (
                <Flex justify="center" mt="10">
                    <Text>No watched content yet.</Text>
                </Flex>
            )}
        </Container>
    );
};

export default ConsumptionHabits;
