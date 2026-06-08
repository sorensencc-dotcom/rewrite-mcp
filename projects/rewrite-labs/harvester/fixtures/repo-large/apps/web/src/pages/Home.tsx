import React, { useEffect, useState } from 'react';

interface AppData {
  title: string;
  items: string[];
}

export const HomePage: React.FC = () => {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/data');
        const json = await response.json();
        setData(json);
      } catch (error) {
        console.error('Failed to fetch:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data</div>;

  return (
    <div>
      <h1>{data.title}</h1>
      <ul>
        {data.items.map(item => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
};
