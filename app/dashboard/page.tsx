import Dashboard from './Dashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard - Pet Health Tracker',
  description: 'Monitor your pet\'s health metrics and upcoming appointments',
};

export default function DashboardPage() {
  return <Dashboard />;
}
