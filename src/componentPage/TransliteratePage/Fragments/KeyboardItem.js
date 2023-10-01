import { GridItem, Button } from "@chakra-ui/react";
import React from "react";
import { FaBookOpen, FaPencilAlt } from "react-icons/fa";

export const KeyboardItem = ({ name, value, span, onClick }) => {
  return (
    <GridItem colSpan={span}>
      <Button colorScheme='teal' variant='solid' w='100%' borderRadius='2px' onClick={onClick} name={name}>{value}</Button>
    </GridItem>
  );
};
