import { Container, Flex, Grid, Heading, Input, Skeleton, Spinner } from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { searchData } from "../../services/api"
import CardComponent from "../../components/CardComponent";
import PaginationComponent from "../../components/PaginationComponent";

const Search = () => {
  const [searchValue, setSearchValue] = useState("");
  const [activePage, setActivePage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [tempSearchValue, setTempSearchValue] = useState('');

  useEffect(() => {
    searchData(searchValue, activePage)
      .then((res) => {
        setData(res?.results);
        setActivePage(res?.page);
        setTotalPages(res?.total_pages)
      }).catch((err) => console.log(err, "err"))
      .finally(() => setIsLoading(false));
  }, [searchValue, activePage])

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchValue(tempSearchValue);
  }

  return (
    <Container maxW={"container.xl"}>
      <Flex
        alignItems={"baseline"}
        gap={"4"}
        my={"10"}
      >
        <Heading
          as="h2"
          fontSize={"md"}
          textTransform={"uppercase"}>
          Search
        </Heading>
      </Flex>

      <form onSubmit={handleSearch}>
        <Input
          placeholder="Search movies,tv shows ..."
          _placeholder={{ color: "gray.100" }}
          value={tempSearchValue}
          onChange={(e) => setTempSearchValue(e.target.value)}></Input>
      </form>

      {isLoading && (
        <Flex justifyContent={"center"} mt="10">
          <Spinner size={"xl"} color="red" />
        </Flex>
      )}

      {data?.length === 0 && !isLoading && (
        <Heading textAlign={"center"} as="h3" fontSize={"sm"} mt="10">
          No resluts found
        </Heading>
      )}

      <Grid templateColumns={{
        base: "1fr",
        sm: "repeat(2, 1fr)",
        md: "repeat(4, 1fr)",
        lg: "repeat(5, 1fr)",
      }} gap={"4"} mt={"10"}>
        {data?.length > 0 && !isLoading && data
          .filter(item => item.poster_path)//doar unde avem poster_path
          .map((item) => (
            <CardComponent
              key={item?.id}
              item={item}
              type={item?.media_type}
            />
          ))}
      </Grid>

      {data?.length > 0 && !isLoading && (
        <PaginationComponent
          activePage={activePage}
          totalPages={totalPages}
          setActivePage={setActivePage} />
      )}
    </Container>
  )
}

export default Search