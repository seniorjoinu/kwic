import './App.scss';

import { Component, createEffect } from 'solid-js';
import { MyDocumentsPage } from './pages/my-documents';
import { authorize } from './api';
import { ChatPage } from './pages/chat';

const App: Component = () => {
  createEffect(() => {
    authorize();
  });

  return (
    <>
      <MyDocumentsPage />
      <ChatPage />
    </>
  );
};

export default App;
