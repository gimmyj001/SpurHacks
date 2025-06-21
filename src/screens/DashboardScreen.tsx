import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  AppState,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

interface Photo {
  id: number;
  filename: string;
  original_name: string;
  description: string;
  created_at: string;
}

interface Trade {
  id: number;
  from_username: string;
  from_photo_name: string;
  to_photo_name: string;
  status: string;
  created_at: string;
}

const DashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    fetchDashboardData();
    setupSocket();
    
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App has come to the foreground!');
        fetchDashboardData();
      }
      appState.current = nextAppState;
    });

    // Set up periodic refresh every 30 seconds as fallback
    const intervalId = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => {
      subscription?.remove();
      clearInterval(intervalId);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Refresh data when screen comes into focus
  useEffect(() => {
    const unsubscribe = () => {
      // This will be called when the component unmounts
    };

    // Refresh data when component mounts or when user navigates back
    fetchDashboardData();

    return unsubscribe;
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [photosRes, tradesRes] = await Promise.all([
        axios.get('http://172.20.10.2:3001/api/photos'),
        axios.get('http://172.20.10.2:3001/api/trades')
      ]);

      setPhotos(photosRes.data);
      setTrades(tradesRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    socketRef.current = io('http://172.20.10.2:3001');

    socketRef.current.on('connect', () => {
      console.log('Connected to socket');
      if (user?.id) {
        socketRef.current?.emit('join_user', user.id);
      }
    });

    socketRef.current.on('trade_accepted', (data) => {
      console.log('Trade accepted:', data);
      fetchDashboardData();
      // Show a brief notification that the trade was completed
      Alert.alert('Trade Completed', 'Your photos have been successfully traded!', [
        { text: 'OK', style: 'default' }
      ]);
    });

    socketRef.current.on('trade_declined', (data) => {
      console.log('Trade declined:', data);
      fetchDashboardData();
    });

    socketRef.current.on('new_trade', (data) => {
      console.log('New trade:', data);
      fetchDashboardData();
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from socket');
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const pendingTrades = trades.filter(trade => trade.status === 'pending');
  const recentPhotos = photos.slice(0, 4);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.username}>{user?.username}!</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="images" size={24} color="#667eea" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statNumber}>{photos.length}</Text>
              <Text style={styles.statLabel}>Total Photos</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="swap-horizontal" size={24} color="#10b981" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statNumber}>{pendingTrades.length}</Text>
              <Text style={styles.statLabel}>Pending Trades</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="people" size={24} color="#8b5cf6" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statNumber}>{pendingTrades.length}</Text>
              <Text style={styles.statLabel}>Active Trades</Text>
            </View>
          </View>
        </View>

        {/* Recent Photos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Photos</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {recentPhotos.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="images-outline" size={48} color="#ccc" />
              <Text style={styles.emptyTitle}>No photos yet</Text>
              <Text style={styles.emptySubtitle}>
                Upload your first photo to start trading
              </Text>
            </View>
          ) : (
            <View style={styles.photoGrid}>
              {recentPhotos.map((photo) => (
                <View key={photo.id} style={styles.photoCard}>
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="image" size={24} color="#667eea" />
                  </View>
                  <Text style={styles.photoName} numberOfLines={1}>
                    {photo.original_name}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Recent Trades */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Trades</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {pendingTrades.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="swap-horizontal-outline" size={48} color="#ccc" />
              <Text style={styles.emptyTitle}>No pending trades</Text>
              <Text style={styles.emptySubtitle}>
                All your trades have been processed
              </Text>
            </View>
          ) : (
            <View style={styles.tradesList}>
              {pendingTrades.slice(0, 3).map((trade) => (
                <View key={trade.id} style={styles.tradeItem}>
                  <View style={styles.tradeInfo}>
                    <Text style={styles.tradeUser}>{trade.from_username}</Text>
                    <Text style={styles.tradePhotos}>
                      {trade.from_photo_name} ↔ {trade.to_photo_name}
                    </Text>
                  </View>
                  <View style={[
                    styles.tradeStatus,
                    trade.status === 'pending' && styles.statusPending,
                    trade.status === 'accepted' && styles.statusAccepted,
                    trade.status === 'declined' && styles.statusDeclined,
                  ]}>
                    <Text style={styles.statusText}>{trade.status}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="camera" size={24} color="white" />
              <Text style={styles.actionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="images" size={24} color="white" />
              <Text style={styles.actionText}>Upload Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="swap-horizontal" size={24} color="white" />
              <Text style={styles.actionText}>Start Trade</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
  },
  username: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statContent: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  photoCard: {
    width: '48%',
    marginBottom: 15,
    marginRight: '2%',
  },
  photoPlaceholder: {
    width: '100%',
    height: 80,
    backgroundColor: '#f0f4ff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoName: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  tradesList: {
    gap: 10,
  },
  tradeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tradeInfo: {
    flex: 1,
  },
  tradeUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  tradePhotos: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  tradeStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusAccepted: {
    backgroundColor: '#d1fae5',
  },
  statusDeclined: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },
});

export default DashboardScreen; 