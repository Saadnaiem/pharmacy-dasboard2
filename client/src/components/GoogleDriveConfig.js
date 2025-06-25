import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './GoogleDriveConfig.css';

function GoogleDriveConfig({ onDataSourceChange }) {
  const [googleDriveUrl, setGoogleDriveUrl] = useState('');
  const [currentConfig, setCurrentConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    loadCurrentConfig();
  }, []);

  const loadCurrentConfig = async () => {
    try {
      const response = await axios.get('/api/config/google-drive-url');
      setCurrentConfig(response.data);
      setGoogleDriveUrl(response.data.google_drive_url || '');
    } catch (error) {
      console.error('Failed to load configuration:', error);
    }
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await axios.post('/api/config/google-drive-url', {
        url: googleDriveUrl
      });
      
      setMessage(response.data.message);
      await loadCurrentConfig();
      
      // Notify parent component that data source changed
      if (onDataSourceChange) {
        onDataSourceChange();
      }
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
      
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to update configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleClearConfig = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await axios.post('/api/config/google-drive-url', {
        url: ''
      });
      
      setMessage(response.data.message);
      setGoogleDriveUrl('');
      await loadCurrentConfig();
      
      // Notify parent component that data source changed
      if (onDataSourceChange) {
        onDataSourceChange();
      }
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
      
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to clear configuration');
    } finally {
      setLoading(false);
    }
  };

  const getShareableInstructions = () => {
    return (
      <div className="instructions">
        <h4>📋 How to get Google Drive CSV link:</h4>
        <ol>
          <li>Upload your CSV file to Google Drive</li>
          <li>Right-click the file → "Share"</li>
          <li>Change access to "Anyone with the link"</li>
          <li>Copy the share link</li>
          <li>Paste it below (any Google Drive format works)</li>
        </ol>
        <p><strong>Supported formats:</strong></p>
        <ul>
          <li>https://drive.google.com/file/d/FILE_ID/view?usp=sharing</li>
          <li>https://drive.google.com/open?id=FILE_ID</li>
          <li>https://drive.google.com/uc?id=FILE_ID</li>
        </ul>
      </div>
    );
  };

  return (
    <div className="google-drive-config">
      <div className="config-header">
        <button 
          className="toggle-config-btn"
          onClick={() => setShowConfig(!showConfig)}
          title="Configure Google Drive Data Source"
        >
          ☁️ Data Source
          {currentConfig && (
            <span className={`status-indicator ${currentConfig.data_source === 'Google Drive' ? 'google-drive' : 'local'}`}>
              {currentConfig.data_source}
            </span>
          )}
        </button>
      </div>

      {showConfig && (
        <div className="config-panel">
          <div className="config-content">
            <h3>📁 Data Source Configuration</h3>
            
            {currentConfig && (
              <div className="current-status">
                <p><strong>Current Source:</strong> {currentConfig.data_source}</p>
                {currentConfig.google_drive_url && (
                  <p><strong>Google Drive URL:</strong> 
                    <span className="url-display">{currentConfig.google_drive_url.substring(0, 50)}...</span>
                  </p>
                )}
                <p><strong>Local File Available:</strong> {currentConfig.has_local_file ? '✅ Yes' : '❌ No'}</p>
              </div>
            )}

            <div className="config-form">
              <label htmlFor="googleDriveUrl">Google Drive CSV URL:</label>
              <input
                id="googleDriveUrl"
                type="url"
                value={googleDriveUrl}
                onChange={(e) => setGoogleDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/your-file-id/view?usp=sharing"
                disabled={loading}
              />
              
              <div className="config-actions">
                <button 
                  onClick={handleSaveConfig}
                  disabled={loading || !googleDriveUrl.trim()}
                  className="save-btn"
                >
                  {loading ? '⏳ Saving...' : '💾 Save & Test'}
                </button>
                
                <button 
                  onClick={handleClearConfig}
                  disabled={loading}
                  className="clear-btn"
                >
                  {loading ? '⏳ Clearing...' : '🗑️ Use Local File'}
                </button>
              </div>
            </div>

            {message && (
              <div className={`config-message ${message.includes('error') || message.includes('Failed') ? 'error' : 'success'}`}>
                {message}
              </div>
            )}

            {getShareableInstructions()}
          </div>
        </div>
      )}
    </div>
  );
}

export default GoogleDriveConfig;
