import React, { useState } from 'react';
import LoginForm from '../components/AuthForm/LoginForm';
import ErrorModel from '../components/ErrorModel';
import './LoginPage.css';
import AdditionalQueryForm from '../components/AuthForm/AdditionalQueryForm';

const LoginPage: React.FC = () => {
  const [errorPage, setErrorPage] = useState(false);
  const [errorPageData, setErrorPageData] = useState({
    title: '',
    message: ''
  });

  const handleShowError = (title: string, message: string) => {
    setErrorPageData({ title, message });
    setErrorPage(true);
  };

  const handleModalConfirm = () => {
    setErrorPage(false);
  };

  const handleModalClose = () => {
    setErrorPage(false);
  };


  const [showAdditionalQueryForm, setShowAdditionalQueryForm] = useState(false);

  const handleOpenAdditionalQueryForm = () => {
    setShowAdditionalQueryForm(true);
  };

  const handleCloseAdditionalQueryForm = () => {
    setShowAdditionalQueryForm(false);
  };

  return (
    <div className='main-login'>
      <div className='loginpage-form'>
        <div className="login-form-container">
          <LoginForm onShowError={handleShowError} onOpenSupport={handleOpenAdditionalQueryForm} />
        </div>   
        <img src="/assets/Welcome-to-Cas.png" alt='login-page' className='login-img'/>
      </div>
      <footer className="login-footer">
        <p>&copy; {new Date().getFullYear()} CAS Ticket System. All rights reserved.</p>
      </footer>
      
      {errorPage && (
        <ErrorModel 
          visible={true} 
          title={''} 
          message={errorPageData.message} 
          onClose={handleModalClose} 
          onConfirm={handleModalConfirm} 
        />
      )}
      <AdditionalQueryForm
        open={showAdditionalQueryForm}
        onClose={handleCloseAdditionalQueryForm}
        onSubmitSuccess={() => {
          handleCloseAdditionalQueryForm();
        }}
      />
    </div>
  );
};

export default LoginPage;