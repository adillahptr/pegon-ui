import { Grid, Container, Center } from "@chakra-ui/react";
import { useState, React } from "react";
import {
  pegonKeyboardLevel1,
  pegonKeyboardLevel2,
  pegonKeyboardLevel3,
} from "src/utils/pegonKeyboardKeys";
import { KeyboardItem } from "./KeyboardItem";

export const PegonKeyboard = ({ inputText, setInputText }) => {
  const [level, setLevel] = useState(pegonKeyboardLevel1);

  const handleKeyClick = (event) => {
    var key = event.target.name
    if (key === "Shift") {
      setLevel(level == pegonKeyboardLevel2? pegonKeyboardLevel1: pegonKeyboardLevel2)
    } 
    else if (key === "Level3") {
      setLevel(pegonKeyboardLevel3)
    }
    else if (key === "Level1") {
      setLevel(pegonKeyboardLevel1)
    }
    
  }

  return (
    <Center bg="gray.700" p="10px">
    <Grid templateColumns="repeat(10, 1fr)" templateRows="repeat(5, 1fr)" gap={1}>
      {level.map((item, index) => {
        return (
          <KeyboardItem
            key={index}
            {...item}
            onClick={handleKeyClick}
          />
        );
      })}
    </Grid>
    </Center>
  );
};