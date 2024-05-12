import { GridItem, Box } from "@chakra-ui/react";
import React from "react";

export const KeyboardItem = ({ fontFamily, name, value, span, onClick }) => {
  return (
    <GridItem bg="gray.700"  p={1} colSpan={span} h="100%">
      <Box as='button' style={fontFamily ? { fontFamily } : null} bg='teal' _hover={{ bg: "teal.700" }} w='100%' h="100%" borderRadius='3px' onClick={onClick} name={name}>{value}</Box>
    </GridItem>
  );
};
