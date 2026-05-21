import { useRef } from "react";
import { useLevelExp } from "./hooks/useLevelExp";
import CharacterPanel from "./components/CharacterPanel";
import Calculator, { type CalcHandle } from "./components/Calculator";
import BaseRateCalculator from "./components/BaseRateCalculator";
import "./index.css";

export default function App() {
    const levelExp = useLevelExp();
    const calcRef = useRef<CalcHandle>(null);

    function handleRateClick(mins: number, exp: number) {
        calcRef.current?.activate(mins, exp);
    }

    return (
        <div className="app-wrapper">
            <CharacterPanel {...levelExp} />
            <Calculator ref={calcRef} {...levelExp} />
            <BaseRateCalculator {...levelExp} onRateClick={handleRateClick} />
        </div>
    );
}
