import { useLevelExp } from './hooks/useLevelExp';
import CharacterPanel from './components/CharacterPanel';
import Calculator from './components/Calculator';
import BaseRateCalculator from './components/BaseRateCalculator';
import './index.css';

export default function App() {
    const levelExp = useLevelExp();

    return (
        <div className="app-wrapper">
            <CharacterPanel {...levelExp} />
            <Calculator {...levelExp} />
            <BaseRateCalculator {...levelExp} />
        </div>
    );
}
