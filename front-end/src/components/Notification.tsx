import React, { useEffect } from 'react';
import './Notification.css';

interface NotificationProps {
  message: string;
  duration?: number; // durée d'affichage en ms
  onClose: () => void; // callback pour fermer la notif
}

const Notification: React.FC<NotificationProps> = ({
  message,
  duration = 4000,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return <div className="notification">{message}</div>;
};

export default Notification;
