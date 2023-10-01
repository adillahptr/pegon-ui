import { GridItem, Button, Box } from "@chakra-ui/react";
import React from "react";
import { FaBookOpen, FaPencilAlt } from "react-icons/fa";

export const KeyboardItem = ({ name, value, span, onClick }) => {
  return (
    <GridItem colSpan={span}>
      <Button colorScheme='teal' w='100%' borderRadius='3px' onClick={onClick} name={name}>{value}</Button>
    </GridItem>
  );
};
