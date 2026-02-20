import { HashRouter, Routes, Route } from 'react-router-dom';
import { Popup } from './pages/Popup';
import { Dashboard } from './pages/Dashboard';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Popup />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
