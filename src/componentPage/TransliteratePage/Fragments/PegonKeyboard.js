import { Grid, Container, Center } from "@chakra-ui/react";
import { useState, React } from "react";
import {
  pegonKeyboardLevel1,
  pegonKeyboardLevel2,
  pegonKeyboardLevel3,
} from "src/utils/pegonKeyboardKeys";
import { KeyboardItem } from "./KeyboardItem";

export const PegonKeyboard = ({ inputText, setInputText, inputElementRef }) => {
  const [level, setLevel] = useState(pegonKeyboardLevel1);
  var inputElement = document.querySelector("TextArea[aria-readonly='false']")

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
    else if (key === "Space") {
      const { selectionStart, selectionEnd, value } = inputElementRef.current
      inputElementRef.current.value = value.substring(0, selectionStart) + ' ' + value.substring(selectionEnd);
      setInputText(inputElementRef.current.value)
      inputElementRef.current.selectionStart = selectionStart + 1;
      inputElementRef.current.selectionEnd = selectionStart + 1;

    }
    else if (key === "BackSpace") {
      const { selectionStart, selectionEnd, value } = inputElementRef.current;
      let newValue;
      if (selectionStart !== selectionEnd) {
        newValue = value.substring(0, selectionStart) + value.substring(selectionEnd);
      } else {
        newValue = value.substring(0, selectionStart - 1) + value.substring(selectionStart);
      }
      inputElementRef.current.value = newValue;
      setInputText(inputElementRef.current.value)
      inputElementRef.current.selectionStart = selectionStart > 0 ? selectionStart - 1 : selectionStart;
      inputElementRef.current.selectionEnd = inputElementRef.current.selectionStart;
    }
    else if (key === "Enter") {
      const { selectionStart, selectionEnd, value } = inputElementRef.current
      inputElementRef.current.value = value.substring(0, selectionStart) + '\n' + value.substring(selectionEnd);
      setInputText(inputElementRef.current.value)
      inputElementRef.current.selectionStart = selectionStart + 1;
      inputElementRef.current.selectionEnd = selectionStart + 1;
    }
    else {
      const inputElement = document.getElementById('translit-textarea');
      const { selectionStart, selectionEnd, value } = inputElementRef.current
      inputElementRef.current.value = value.substring(0, selectionStart) + event.target.innerText + value.substring(selectionEnd);
      setInputText(inputElementRef.current.value)
      inputElementRef.current.selectionStart = selectionStart + 1;
      inputElementRef.current.selectionEnd = selectionStart + 1;
    }
    inputElementRef.current.focus()
  }

  return (
    <Center bg="gray.700" p={2}>
      <Grid templateColumns="repeat(10, 1fr)" 
        templateRows="repeat(5, 1fr)" 
        gap={1} 
        w="100%"
      >
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