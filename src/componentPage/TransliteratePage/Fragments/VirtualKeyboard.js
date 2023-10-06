import { PegonKeyboard } from "./PegonKeyboard";

import "@fontsource/scheherazade-new"
import { getFont } from "src/utils/objects";

export const checkHasKeyboard = (script) => {
    const availableKeyboard = ["Pegon"];

    return availableKeyboard.includes(script);
} 

export const VirtualKeyboard = ({
    script,
    variant,
    setInputText,
    inputElementRef
}) => {
    const fontFamily = getFont(script, variant);
    switch (script) {
        case "Pegon":
            return <PegonKeyboard
            setInputText={setInputText}
            inputElementRef={inputElementRef}
            fontFamily={fontFamily}
          />
    }
    return null;
}