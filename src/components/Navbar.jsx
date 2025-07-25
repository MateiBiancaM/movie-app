import { Avatar, Box, Button, Container, Drawer, DrawerBody, DrawerCloseButton, DrawerContent, DrawerHeader, DrawerOverlay, Flex, IconButton, Menu, MenuButton, MenuItem, MenuList, useDisclosure, Image, HStack } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { HamburgerIcon, SearchIcon } from "@chakra-ui/icons";

const Navbar = () => {
  const { user, signInWithGoogle, logout } = useAuth();
  const { onOpen, isOpen, onClose } = useDisclosure();

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      console.log('succes');
    } catch (error) {
      console.log('err', error);
    }
  }
  return (
    <Box py="4" mb="2">
      <Container maxW="container.xl">
        <Flex justifyContent="space-between" alignItems="center">

          {/* Logo */}
          <Link to="/">
            <HStack spacing={2} align="center">
              <Image src="/logo.png" alt="logo" boxSize="64px" />
              <Box
                fontSize="3xl"
                fontWeight="bold"
                color="#9F3CFA"
                letterSpacing="widest"
                fontFamily="mono"
              >
                CineTrack
              </Box>
            </HStack>
          </Link>

          {/* DESKTOP */}
          <Flex gap="4" alignItems="center" display={{ base: "none", md: "flex" }}>
            <Link to="/">Home</Link>
            <Link to="/movies">Movies</Link>
            <Link to="/shows">TV Shows</Link>
            <Link to="/search">
              <SearchIcon fontSize={"xl"} />
            </Link>

            {user && (
              <Menu>
                <MenuButton>
                  <Avatar bg={"red.500"} color={"white"} size="sm" name={user?.email} />
                </MenuButton>
                <MenuList>
                  <Link to="/watchlist">
                    <MenuItem>Watchlist</MenuItem>
                  </Link>
                  <Link to="/watched">
                    <MenuItem>Watched</MenuItem>
                  </Link>
                  <Link to="/recommendations">
                    <MenuItem>Recommendations</MenuItem>
                  </Link>
                  <Link to="/consumption">
                    <MenuItem>Consumption Habits</MenuItem>
                  </Link>
                  <Link to="/financial">
                    <MenuItem>Financial Reports</MenuItem>
                  </Link>
                  <MenuItem onClick={logout}>Logout</MenuItem>
                </MenuList>
              </Menu>
            )}
            {!user && (
              <Avatar size="sm" bg="gray.800" as="button" onClick={handleGoogleLogin} />
            )}
          </Flex>

          {/* MOBILE */}
          <Flex
            display={{ base: "flex", md: "none" }}
            alignItems={"center"}
            gap="4"
          >
            <Link to="/search">
              <SearchIcon fontSize={"xl"} />
            </Link>
            <IconButton onClick={onOpen} icon={<HamburgerIcon />} />
            <Drawer isOpen={isOpen} placement="right" onClose={onClose}>
              <DrawerOverlay />
              <DrawerContent bg={"black"}>
                <DrawerCloseButton />
                <DrawerHeader>
                  {user ? (
                    <Flex alignItems="center" gap="2">
                      <Avatar bg="red.500" size={"sm"} name={user?.email} />
                      <Box fontSize={"sm"}>
                        {user?.displayName || user?.email}
                      </Box>
                    </Flex>
                  ) : (
                    <Avatar
                      size={"sm"}
                      bg="gray.800"
                      as="button"
                      onClick={handleGoogleLogin}
                    />
                  )}
                </DrawerHeader>

                <DrawerBody>
                  <Flex flexDirection={"column"} gap={"4"} onClick={onClose}>
                    <Link to="/">Home</Link>
                    <Link to="/movies">Movies</Link>
                    <Link to="/shows">TV Shows</Link>
                    {user && (
                      <>
                        <Link to="/watchlist">Watchlist</Link>
                        <Link to="/watched">Watched</Link>
                        <Link to="/recommendations">Recommendations</Link>
                        <Link to="/consumption">Consumption Habits</Link>
                        <Link to="/financial">Financial Reports</Link>
                        <Button
                          variant={"outline"}
                          colorScheme="red"
                          onClick={logout}
                        >
                          Logout
                        </Button>
                      </>
                    )}
                  </Flex>
                </DrawerBody>
              </DrawerContent>
            </Drawer>
          </Flex>
        </Flex>
      </Container>
    </Box>
  );
};

export default Navbar;
