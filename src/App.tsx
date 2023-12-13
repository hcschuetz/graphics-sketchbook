import { FC } from 'react';
import './App.css'
import Slides from './slides/Slides';
import { useControls } from 'leva';


const App: FC = () => {
  return (
    <div className="App">
      <Slides/>
    </div>
  );
};

export default App;

window.onbeforeunload = () => confirm("Really leave this page?")
