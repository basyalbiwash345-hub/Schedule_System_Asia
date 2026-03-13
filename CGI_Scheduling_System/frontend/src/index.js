import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';

const theme = createTheme({
    palette: {
        primary: {
            main: '#e31937',
        },
    },
    typography: {
        fontFamily: '"Inter", "Segoe UI", sans-serif',
    },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <App />
        </ThemeProvider>
    </React.StrictMode>
);