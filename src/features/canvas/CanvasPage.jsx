import React from 'react';
import { Button } from '../../components/button/Button';
import { useNavigate } from 'react-router';

export const Component = () => {
  const navigate = useNavigate();
  return (
    <div>
      <h1>Canvas Page</h1>
      <Button onClick={() => navigate('/')}>Go to Dashboard</Button>
      <Button onClick={() => navigate('/login')}>Go to Login</Button>
    </div>
  );
};
