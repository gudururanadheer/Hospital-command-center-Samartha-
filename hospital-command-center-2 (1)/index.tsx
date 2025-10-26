import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import StaffRegistration from './components/StaffRegistration';
import StaffDashboard from './components/StaffDashboard';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

const AppRouter: React.FC = () => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const id = params.get('id');

    if (view === 'register') {
        return <StaffRegistration />;
    }
    if (view === 'staff_dashboard' && id) {
        return <StaffDashboard staffId={id} />;
    }

    return <App />;
}


root.render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);
