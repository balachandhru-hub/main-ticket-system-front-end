import React from 'react';

interface SpinnerLoaderProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  fullScreen?: boolean;
  text?: string;
}

const SpinnerLoaders: React.FC<SpinnerLoaderProps> = ({ 
  size = 'medium', 
  color = '#2563eb',
  fullScreen = true,
  text = 'Loading...'
}) => {
  
  const sizeMap = {
    small: '2rem',
    medium: '3rem',
    large: '4rem'
  };

  const spinnerSize = sizeMap[size];

  const styles: { [key: string]: React.CSSProperties } = {
    overlay: {
      position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(255, 255, 255, 0.3)', // lighter transparency
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)', 
  transition: 'backdrop-filter 0.3s ease, background-color 0.3s ease'
    },
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem'
    },
    spinner: {
      width: spinnerSize,
      height: spinnerSize,
      border: `0.25rem solid #f3f3f3`,
      borderTop: `0.25rem solid ${color}`,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    text: {
      fontSize: '1rem',
      color: '#333',
      fontWeight: 500,
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }
  };

  const spinnerElement = (
    <div style={styles.container}>
      <div style={styles.spinner}></div>
      {text && <div style={styles.text}>{text}</div>}
    </div>
  );

  // If fullScreen is false, render inline without overlay
  if (!fullScreen) {
    return (
      <>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
        {spinnerElement}
      </>
    );
  }

  // If fullScreen is true, render with overlay
  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={styles.overlay}>
        {spinnerElement}
      </div>
    </>
  );
};

export default SpinnerLoaders;