import axios from "axios";

export const imagePath = "https://image.tmdb.org/t/p/w500";
export const imagePathOriginal = "https://image.tmdb.org/t/p/original";


const baseUrl = "https://api.themoviedb.org/3";
const apiKey = import.meta.env.VITE_API_KEY;

//THRENDING
export const fetchTrending = async (timeWindow = 'day') => {
  const { data } = await axios.get(
    `${baseUrl}/trending/all/${timeWindow}?api_key=${apiKey}`
  );

  return data?.results;
}

//MOVIES & SERIES -Details

export const fetchDetails = async (type, id) => {
  const res = await axios.get(`${baseUrl}/${type}/${id}?api_key=${apiKey}`);
  return res?.data;
}

// MOVIES & SERIES -Credits
export const fetchCredits = async (type, id) => {
  const res = await axios.get(`${baseUrl}/${type}/${id}/credits?api_key=${apiKey}`);
  return res?.data;
}

// MOVIES & SERIES -Videos
export const fetchVideos = async (type, id) => {
  const res = await axios.get(`${baseUrl}/${type}/${id}/videos?api_key=${apiKey}`);
  return res?.data;
}

//DISCOVER
export const fetchMovies = async (page, sortBy) => {
  const res = await axios.get(`${baseUrl}/discover/movie?api_key=${apiKey}&page=${page}&sort_by=${sortBy}`);
  return res?.data;
}

export const fetchTvSeries = async (page, sortBy) => {
  const res = await axios.get(`${baseUrl}/discover/tv?api_key=${apiKey}&page=${page}&sort_by=${sortBy}`);
  return res?.data;
}

//SEARCH 

export const searchData = async (querry, page) => {
  const res = await axios.get(`${baseUrl}/search/multi?api_key=${apiKey}&query=${querry}&page=${page}`);
  return res?.data;
}

//GENERE
export const getGenreMap = async () => {
  try {
    const [movieGenres, tvGenres] = await Promise.all([
      axios.get(`${baseUrl}/genre/movie/list?api_key=${apiKey}`),
      axios.get(`${baseUrl}/genre/tv/list?api_key=${apiKey}`),
    ]);

    const allGenres = [
      ...(movieGenres?.data?.genres || []),
      ...(tvGenres?.data?.genres || []),
    ];

    const genreMap = {};
    allGenres.forEach((genre) => {
      genreMap[genre.id] = genre.name.toLowerCase();
    });

    return genreMap; // 28: "Action", 12: "Adventure"
  } catch (error) {
    console.error("Failed to fetch genres:", error);
    return {};
  }
}

export const fetchMoviesBulk = async (pages = 5, sortBy = "popularity.desc") => {
  const all = [];

  for (let page = 1; page <= pages; page++) {
    const res = await axios.get(`${baseUrl}/discover/movie?api_key=${apiKey}&page=${page}&sort_by=${sortBy}`);
    all.push(...res.data.results);
  }

  return { results: all };
}

export const fetchTvSeriesBulk = async (pages = 5, sortBy = "popularity.desc") => {
  const all = [];

  for (let page = 1; page <= pages; page++) {
    const res = await axios.get(`${baseUrl}/discover/tv?api_key=${apiKey}&page=${page}&sort_by=${sortBy}`);
    all.push(...res.data.results);
  }

  return { results: all };
}




