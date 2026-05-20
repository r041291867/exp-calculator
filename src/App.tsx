import { useLevelExp } from './hooks/useLevelExp';
import CharacterPanel from './components/CharacterPanel';
import Calculator from './components/Calculator';
import AuraCalculator from './components/AuraCalculator';
import BaseRateCalculator from './components/BaseRateCalculator';
import './index.css';

export default function App() {
    const levelExp = useLevelExp();

    return (
        <div className="app-wrapper">
            <CharacterPanel {...levelExp} />
            <Calculator {...levelExp} />
            <div className="bottom-row">
                <AuraCalculator />
                <BaseRateCalculator {...levelExp} />
            </div>
        </div>
    );
}
