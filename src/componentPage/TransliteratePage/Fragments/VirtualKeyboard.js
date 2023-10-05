import { PegonKeyboard } from "./PegonKeyboard";

export const checkHasKeyboard = (script) => {
    const availableKeyboard = ["Pegon"];

    return availableKeyboard.includes(script);
} 

export const VirtualKeyboard = ({
    script,
    setInputText,
    inputElementRef
}) => {
    switch (script) {
        case "Pegon":
            return <PegonKeyboard
            setInputText={setInputText}
            inputElementRef={inputElementRef}
          />
    }
    return null;
}