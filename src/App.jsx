import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import ProjectPage from './pages/ProjectPage.jsx';
import LaunchPage from './pages/LaunchPage.jsx';
import NotFound from './pages/NotFound.jsx';
import { site } from './brand/site.js';

// The dashboard loads only when someone opens /admin.
const Admin = lazy(() => import('./admin/Admin.jsx'));

function ArAlias() {
  const { slug } = useParams();
  return <Navigate to={`${site.workPath}/${slug}`} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Full-screen experiences render outside the site chrome. */}
      <Route path={`${site.workPath}/:slug/launch`} element={<LaunchPage />} />

      {/* The dashboard: its own plain page, no floating field. */}
      <Route
        path="/admin"
        element={
          <Suspense fallback={null}>
            <Admin />
          </Suspense>
        }
      />

      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path={`${site.workPath}/:slug`} element={<ProjectPage />} />
        <Route path="/ar/:slug" element={<ArAlias />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
