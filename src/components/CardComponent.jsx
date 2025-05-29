import { Box, Flex, Image, Text,Progress } from '@chakra-ui/react'
import React from 'react'
import { Link } from "react-router-dom";
import { imagePath } from '../services/api';
import { StarIcon } from '@chakra-ui/icons';

const CardComponent = ({item, type,similarity }) => {
  return (
    <Link to={`/${type}/${item?.id}`}>
        <Box 
            position="relative" 
            overflow="hidden" 
            role="group" 
            cursor="pointer"
            transform="scale(1)"
            transition="transform 0.3s ease-in-out"
            _hover={{
              transform: "scale(1.05)"
            }}
        >
            <Image 
                src={`${imagePath}/${item.poster_path}`} 
                alt={item?.title || item?.name} 
                width="100%"
                height="100%"
                objectFit="cover"
            />
            <Box 
                position="absolute"
                bottom="0"
                left="0"
                w="100%"
                h="33%"
                bg="rgba(0,0,0,0.8)"
                color="white"
                opacity="0"
                p="2"
                transition="opacity 0.3s ease-in-out"
                _groupHover={{ opacity: 1 }}>
                <Text textAlign={"center"}>
                    {item?.title || item?.name}
                </Text>
                <Text textAlign={"center"} fontSize={"small"} color={"green.200"}>
                    {new Date(item?.release_date || item?.first_air_date).getFullYear() || "N/A"}
                </Text>
                <Flex
                    alignItems={"center"}
                    justifyContent={"center"}
                    gap={"2"}
                    mt="4"
                    >
                    <StarIcon fontSize={"small"}/>
                    <Text>{item?.vote_average?.toFixed(1)}</Text>
                   
                </Flex>
            </Box>
        </Box>
    </Link>
  )
}

export default CardComponent