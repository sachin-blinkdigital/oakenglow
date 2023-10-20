import { Route, Routes } from "react-router-dom";
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import '../src/assets/scss/main.scss'
import NotFound from "./pages/NotFound";
import 'react-image-crop/dist/ReactCrop.css'

function App() {

  return (
    <Routes>
      <Route path='/' element={<Layout />}>
        <Route index element={<Home />} />
        {/* <Route path='/about' element={<About />} /> */}

        {/* CATCH ALL */}
        <Route path='*' element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
