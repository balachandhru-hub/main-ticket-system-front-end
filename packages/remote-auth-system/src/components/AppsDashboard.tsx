import { useEffect, useState } from 'react';
import { getAppNamesByUser } from '../api/appModelApi';
import type { AppModel } from '../Dto/AppModelResponseDto';

interface AppCard {
  id: string;
  title: string;
  description: string;
  link?: string;
}

const AppsDashboard = () => {
  const [apps, setApps] = useState<AppCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApps = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await getAppNamesByUser();

        if (Array.isArray(response)) {
          const appCards = response.map((app: AppModel) => ({
            id: app.id,
            title: app.name,
            description: app.description || app.key || 'App access model',
            link: app.link,
          }));
          setApps(appCards);
        } else {
          setError(response.description || response.message || 'Failed to load apps');
        }
      } catch {
        setError('An unexpected error occurred while loading apps');
      } finally {
        setLoading(false);
      }
    };

    fetchApps();
  }, []);

  const isSilaFatoraApp = (app: AppCard) => {
    const titleLower = app.title.toLowerCase().trim();
    const descLower = app.description.toLowerCase().trim();
    return (
      titleLower.includes('fatora') ||
      titleLower.includes('fatoora') ||
      titleLower.includes('sila') ||
      titleLower.includes('buyer invoice') ||
      descLower.includes('fatora') ||
      descLower.includes('fatoora') ||
      descLower.includes('buyer invoice')
    );
  };

  const handleOpen = (app: AppCard) => {
    if (isSilaFatoraApp(app)) {
      window.open('/dashboard/buyer-invoice', '_blank', 'noopener,noreferrer');
      return;
    }
    if (!app.link) return;
    window.open(app.link, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bots-container">
      <div className="bots-body">
        {loading ? (
          <div className="bots-loading">
            <div className="spinner"></div>
            <p>Loading apps...</p>
          </div>
        ) : error ? (
          <div className="bots-error">
            <h2>Error Loading Apps</h2>
            <p>{error}</p>
            <button className="retry-button" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        ) : apps.length === 0 ? (
          <div className="bots-empty">
            <h2>No Apps Available</h2>
            <p>You don't have any apps assigned yet.</p>
          </div>
        ) : (
          <div className="bots-grid">
            {apps.map(app => {
              const isFatora = isSilaFatoraApp(app);
              return (
                <div key={app.id} className="bot-card active">
                  <div className="card-content">
                    <h3 className="card-title">{app.title}</h3>
                    <p className="card-description">{app.description}</p>
                  </div>
                  <button
                    className="open-button enabled"
                    onClick={() => handleOpen(app)}
                    disabled={!isFatora && !app.link}
                  >
                    Open
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AppsDashboard;