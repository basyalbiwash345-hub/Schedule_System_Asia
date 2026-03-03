import React, { useEffect, useState } from 'react';

function App() {
    const [message, setMessage] = useState('Loading...');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('http://localhost:5000/hello');
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.text();
                setMessage(data);
            } catch (error) {
                console.error("Fetch error:", error);
                // We don't change the state to an error immediately so the
                // successful first fetch doesn't get overwritten by a "double-run" error.
            }
        };

        fetchData();
    }, []);

    return (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <h1>{message}</h1>
            <p>If you see the message above, your stack is connected!</p>
        </div>
    );
}

export default App;