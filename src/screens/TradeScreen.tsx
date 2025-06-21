import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  RefreshControl,
  AppState,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

interface User {
  id: number;
  username: string;
  email: string;
}

interface Photo {
  id: number;
  filename: string;
  original_name: string;
  description: string;
}

interface Trade {
  id: number;
  from_username: string;
  from_photo_name: string;
  from_photo_filename: string;
  to_photo_name: string;
  to_photo_filename: string;
  status: string;
  created_at: string;
}

const TradeScreen: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userPhotos, setUserPhotos] = useState<Photo[]>([]);
  const [myPhotos, setMyPhotos] = useState<Photo[]>([]);
  const [selectedMyPhoto, setSelectedMyPhoto] = useState<Photo | null>(null);
  const [selectedUserPhoto, setSelectedUserPhoto] = useState<Photo | null>(null);
  
  // Photo preview modal state
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);
  
  // Friend management state
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [friendUsername, setFriendUsername] = useState('');
  const [pendingRequests, setPendingRequests] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'friends' | 'trades' | 'requests'>('friends');
  const [refreshing, setRefreshing] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    fetchData();
    setupSocket();
    
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App has come to the foreground!');
        fetchData();
      }
      appState.current = nextAppState;
    });

    // Set up periodic refresh every 30 seconds as fallback
    const intervalId = setInterval(() => {
      fetchData();
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
    fetchData();

    return unsubscribe;
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, tradesRes, photosRes, requestsRes] = await Promise.all([
        axios.get('http://172.20.10.2:3001/api/users'),
        axios.get('http://172.20.10.2:3001/api/trades'),
        axios.get('http://172.20.10.2:3001/api/photos'),
        axios.get('http://172.20.10.2:3001/api/friends/requests')
      ]);

      setUsers(usersRes.data);
      setTrades(tradesRes.data);
      setMyPhotos(photosRes.data);
      setPendingRequests(requestsRes.data);
    } catch (error) {
      console.error('Error fetching trade data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const fetchUserPhotos = async (selectedUser: User) => {
    try {
      const response = await axios.get(`http://172.20.10.2:3001/api/users/${selectedUser.id}/photos`);
      setUserPhotos(response.data);
    } catch (error) {
      console.error('Error fetching user photos:', error);
    }
  };

  const handleSendTrade = async () => {
    if (!selectedUser || !selectedMyPhoto || !selectedUserPhoto) {
      Alert.alert('Error', 'Please select all required items');
      return;
    }

    try {
      await axios.post('http://172.20.10.2:3001/api/trades', {
        toUserId: selectedUser.id,
        fromPhotoId: selectedMyPhoto.id,
        toPhotoId: selectedUserPhoto.id,
      });

      Alert.alert('Success', 'Trade request sent!');
      setSelectedUser(null);
      setSelectedMyPhoto(null);
      setSelectedUserPhoto(null);
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to send trade');
    }
  };

  const handleTradeAction = async (tradeId: number, action: 'accept' | 'decline') => {
    try {
      await axios.put(`http://172.20.10.2:3001/api/trades/${tradeId}/${action}`);
      Alert.alert('Success', `Trade ${action}ed!`);
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || `Failed to ${action} trade`);
    }
  };

  const sendFriendRequest = async () => {
    if (!friendUsername.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    try {
      await axios.post('http://172.20.10.2:3001/api/friends/request', {
        friendUsername: friendUsername.trim()
      });
      Alert.alert('Success', 'Friend request sent!');
      setFriendUsername('');
      setShowAddFriendModal(false);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to send friend request');
    }
  };

  const acceptFriendRequest = async (friendId: number) => {
    try {
      await axios.post('http://172.20.10.2:3001/api/friends/accept', { friendId });
      Alert.alert('Success', 'Friend request accepted!');
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to accept friend request');
    }
  };

  const declineFriendRequest = async (friendId: number) => {
    try {
      await axios.post('http://172.20.10.2:3001/api/friends/decline', { friendId });
      Alert.alert('Success', 'Friend request declined');
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to decline friend request');
    }
  };

  const removeFriend = async (friendId: number) => {
    Alert.alert(
      'Remove Friend',
      'Are you sure you want to remove this friend?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.post('http://172.20.10.2:3001/api/friends/remove', { friendId });
              Alert.alert('Success', 'Friend removed');
              fetchData();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to remove friend');
            }
          },
        },
      ]
    );
  };

  const renderTradeItem = ({ item }: { item: Trade }) => (
    <View style={styles.tradeItem}>
      <View style={styles.tradeInfo}>
        <Text style={styles.tradeUser}>{item.from_username}</Text>
        <View style={styles.tradePhotosContainer}>
          <TouchableOpacity 
            style={styles.photoPreviewContainer}
            onPress={() => {
              // Create a Photo object for the from photo
              const fromPhoto: Photo = {
                id: 0, // We don't have the actual photo ID, but we can still preview
                filename: item.from_photo_filename,
                original_name: item.from_photo_name,
                description: ''
              };
              setPreviewPhoto(fromPhoto);
              setShowPhotoPreview(true);
            }}
          >
            <View style={styles.photoPreviewWrapper}>
              <Image
                source={{ uri: `http://172.20.10.2:3001/uploads/${item.from_photo_filename}` }}
                style={styles.photoPreview}
                resizeMode="cover"
              />
              <View style={styles.previewIconOverlay}>
                <Ionicons name="eye-outline" size={12} color="white" />
              </View>
            </View>
            <Text style={styles.photoName} numberOfLines={1}>
              {item.from_photo_name}
            </Text>
          </TouchableOpacity>
          <View style={styles.tradeArrow}>
            <Ionicons name="swap-horizontal" size={20} color="#667eea" />
          </View>
          <TouchableOpacity 
            style={styles.photoPreviewContainer}
            onPress={() => {
              // Create a Photo object for the to photo
              const toPhoto: Photo = {
                id: 0, // We don't have the actual photo ID, but we can still preview
                filename: item.to_photo_filename,
                original_name: item.to_photo_name,
                description: ''
              };
              setPreviewPhoto(toPhoto);
              setShowPhotoPreview(true);
            }}
          >
            <View style={styles.photoPreviewWrapper}>
              <Image
                source={{ uri: `http://172.20.10.2:3001/uploads/${item.to_photo_filename}` }}
                style={styles.photoPreview}
                resizeMode="cover"
              />
              <View style={styles.previewIconOverlay}>
                <Ionicons name="eye-outline" size={12} color="white" />
              </View>
            </View>
            <Text style={styles.photoName} numberOfLines={1}>
              {item.to_photo_name}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.tradeDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      
      <View style={styles.tradeActions}>
        <View style={[
          styles.tradeStatus,
          item.status === 'pending' && styles.statusPending,
          item.status === 'accepted' && styles.statusAccepted,
          item.status === 'declined' && styles.statusDeclined,
        ]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
        
        {item.status === 'pending' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleTradeAction(item.id, 'accept')}
            >
              <Ionicons name="checkmark" size={16} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={() => handleTradeAction(item.id, 'decline')}
            >
              <Ionicons name="close" size={16} color="white" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={[
        styles.userItem,
        selectedUser?.id === item.id && styles.selectedUserItem
      ]}
      onPress={() => {
        setSelectedUser(item);
        fetchUserPhotos(item);
      }}
    >
      <View style={styles.userAvatar}>
        <Ionicons name="person" size={24} color="#667eea" />
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.username}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  const renderPhotoItem = ({ item, isMyPhoto }: { item: Photo; isMyPhoto: boolean }) => (
    <TouchableOpacity
      style={[
        styles.photoItem,
        isMyPhoto && selectedMyPhoto?.id === item.id && styles.selectedPhotoItem,
        !isMyPhoto && selectedUserPhoto?.id === item.id && styles.selectedPhotoItem
      ]}
      onPress={() => {
        // Show full screen preview
        setPreviewPhoto(item);
        setShowPhotoPreview(true);
      }}
      onLongPress={() => {
        // Long press to select for trade
        if (isMyPhoto) {
          setSelectedMyPhoto(item);
        } else {
          setSelectedUserPhoto(item);
        }
      }}
    >
      <View style={styles.photoContainer}>
        <Image
          source={{ uri: `http://172.20.10.2:3001/uploads/${item.filename}` }}
          style={styles.photoThumbnail}
          resizeMode="cover"
        />
        {(isMyPhoto && selectedMyPhoto?.id === item.id) || 
         (!isMyPhoto && selectedUserPhoto?.id === item.id) ? (
          <View style={styles.selectedIndicator}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
          </View>
        ) : null}
      </View>
      <Text style={styles.photoName} numberOfLines={1}>
        {item.original_name}
      </Text>
    </TouchableOpacity>
  );

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
      fetchData();
      // Show a brief notification that the trade was completed
      Alert.alert('Trade Completed', 'Your photos have been successfully traded!', [
        { text: 'OK', style: 'default' }
      ]);
    });

    socketRef.current.on('trade_declined', (data) => {
      console.log('Trade declined:', data);
      fetchData();
    });

    socketRef.current.on('new_trade', (data) => {
      console.log('New trade:', data);
      fetchData();
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from socket');
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading trades...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Trade Center</Text>
        <TouchableOpacity 
          style={styles.addFriendButton}
          onPress={() => setShowAddFriendModal(true)}
        >
          <Ionicons name="person-add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends ({users.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'trades' && styles.activeTab]}
          onPress={() => setActiveTab('trades')}
        >
          <Text style={[styles.tabText, activeTab === 'trades' && styles.activeTabText]}>
            Trades ({trades.filter(trade => trade.status === 'pending').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests ({pendingRequests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {selectedUser ? (
        // Trade Setup View
        <View style={styles.tradeSetup}>
          <View style={styles.tradeSetupHeader}>
            <Text style={styles.tradeSetupTitle}>
              Trading with {selectedUser.username}
            </Text>
            <TouchableOpacity onPress={() => setSelectedUser(null)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* My Photos */}
          <View style={styles.photoSection}>
            <Text style={styles.photoSectionTitle}>Select Your Photo</Text>
            <Text style={styles.photoInstruction}>Tap to preview • Long press to select</Text>
            <FlatList
              data={myPhotos}
              renderItem={({ item }) => renderPhotoItem({ item, isMyPhoto: true })}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoList}
            />
          </View>

          {/* Their Photos */}
          <View style={styles.photoSection}>
            <Text style={styles.photoSectionTitle}>Select Their Photo</Text>
            <Text style={styles.photoInstruction}>Tap to preview • Long press to select</Text>
            <FlatList
              data={userPhotos}
              renderItem={({ item }) => renderPhotoItem({ item, isMyPhoto: false })}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoList}
            />
          </View>

          {/* Create Trade Button */}
          <TouchableOpacity
            style={[
              styles.createTradeButton,
              (!selectedMyPhoto || !selectedUserPhoto) && styles.createTradeButtonDisabled
            ]}
            onPress={handleSendTrade}
            disabled={!selectedMyPhoto || !selectedUserPhoto}
          >
            <Text style={styles.createTradeButtonText}>Create Trade</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Main Content based on active tab
        <View style={styles.content}>
          {activeTab === 'friends' && (
            <View style={styles.tabContent}>
              {users.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyTitle}>No friends yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Add friends to start trading photos
                  </Text>
                  <TouchableOpacity
                    style={styles.addFriendEmptyButton}
                    onPress={() => setShowAddFriendModal(true)}
                  >
                    <Text style={styles.addFriendEmptyButtonText}>Add Your First Friend</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={users}
                  renderItem={({ item }) => (
                    <View style={styles.friendItem}>
                      <TouchableOpacity
                        style={styles.friendInfo}
                        onPress={() => {
                          setSelectedUser(item);
                          fetchUserPhotos(item);
                        }}
                      >
                        <View style={styles.userAvatar}>
                          <Ionicons name="person" size={24} color="#667eea" />
                        </View>
                        <View style={styles.userInfo}>
                          <Text style={styles.userName}>{item.username}</Text>
                          <Text style={styles.userEmail}>{item.email}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removeFriendButton}
                        onPress={() => removeFriend(item.id)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#ff4757" />
                      </TouchableOpacity>
                    </View>
                  )}
                  keyExtractor={(item) => item.id.toString()}
                  showsVerticalScrollIndicator={false}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={onRefresh}
                    />
                  }
                />
              )}
            </View>
          )}

          {activeTab === 'trades' && (
            <View style={styles.tabContent}>
              {trades.filter(trade => trade.status === 'pending').length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="swap-horizontal-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyTitle}>No pending trades</Text>
                  <Text style={styles.emptySubtitle}>
                    All your trades have been processed
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={trades.filter(trade => trade.status === 'pending')}
                  renderItem={renderTradeItem}
                  keyExtractor={(item) => item.id.toString()}
                  showsVerticalScrollIndicator={false}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={onRefresh}
                    />
                  }
                />
              )}
            </View>
          )}

          {activeTab === 'requests' && (
            <View style={styles.tabContent}>
              {pendingRequests.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="mail-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyTitle}>No pending requests</Text>
                  <Text style={styles.emptySubtitle}>
                    You're all caught up!
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={pendingRequests}
                  renderItem={({ item }) => (
                    <View style={styles.requestItem}>
                      <View style={styles.userAvatar}>
                        <Ionicons name="person" size={24} color="#667eea" />
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{item.username}</Text>
                        <Text style={styles.userEmail}>{item.email}</Text>
                      </View>
                      <View style={styles.requestActions}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.acceptButton]}
                          onPress={() => acceptFriendRequest(item.id)}
                        >
                          <Ionicons name="checkmark" size={16} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.declineButton]}
                          onPress={() => declineFriendRequest(item.id)}
                        >
                          <Ionicons name="close" size={16} color="white" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  keyExtractor={(item) => item.id.toString()}
                  showsVerticalScrollIndicator={false}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={onRefresh}
                    />
                  }
                />
              )}
            </View>
          )}
        </View>
      )}

      {/* Add Friend Modal */}
      <Modal
        visible={showAddFriendModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddFriendModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Friend</Text>
              <TouchableOpacity onPress={() => setShowAddFriendModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              Enter the username of the person you want to add as a friend
            </Text>
            
            <TextInput
              style={styles.friendUsernameInput}
              placeholder="Enter username"
              value={friendUsername}
              onChangeText={setFriendUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddFriendModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sendRequestButton}
                onPress={sendFriendRequest}
              >
                <Text style={styles.sendRequestButtonText}>Send Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Photo Preview Modal */}
      {showPhotoPreview && previewPhoto && (
        <Modal
          visible={showPhotoPreview}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPhotoPreview(false)}
        >
          <View style={styles.photoPreviewOverlay}>
            <View style={styles.photoPreviewContent}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowPhotoPreview(false)}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
              <Image
                source={{ uri: `http://172.20.10.2:3001/uploads/${previewPhoto.filename}` }}
                style={styles.photoPreviewImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addFriendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  tab: {
    padding: 10,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#667eea',
  },
  tabText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  activeTabText: {
    color: '#667eea',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  addFriendEmptyButton: {
    backgroundColor: '#667eea',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  addFriendEmptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  tradeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
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
  tradePhotosContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  photoPreviewContainer: {
    alignItems: 'center',
    marginHorizontal: 5,
    position: 'relative',
  },
  photoPreviewWrapper: {
    position: 'relative',
  },
  photoPreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginBottom: 5,
  },
  tradeArrow: {
    marginHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoName: {
    fontSize: 10,
    color: '#333',
    textAlign: 'center',
  },
  tradeDate: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  tradeActions: {
    alignItems: 'flex-end',
  },
  tradeStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 5,
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
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  acceptButton: {
    backgroundColor: '#10b981',
  },
  declineButton: {
    backgroundColor: '#ef4444',
  },
  tradeSetup: {
    flex: 1,
    padding: 20,
  },
  tradeSetupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tradeSetupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  photoSection: {
    marginBottom: 20,
  },
  photoSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  photoInstruction: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  photoList: {
    paddingHorizontal: 5,
  },
  photoItem: {
    width: 80,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  selectedPhotoItem: {
    backgroundColor: '#f0f4ff',
    borderRadius: 8,
    padding: 5,
  },
  photoThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginBottom: 5,
  },
  friendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  removeFriendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff4757',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  requestActions: {
    flexDirection: 'row',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    width: '80%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  friendUsernameInput: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ccc',
    padding: 10,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  sendRequestButton: {
    backgroundColor: '#667eea',
    padding: 10,
    borderRadius: 8,
  },
  sendRequestButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedUserItem: {
    backgroundColor: '#f0f4ff',
    borderRadius: 8,
    marginHorizontal: -10,
    paddingHorizontal: 10,
  },
  createTradeButton: {
    backgroundColor: '#667eea',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  createTradeButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createTradeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  photoPreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPreviewContent: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  photoPreviewImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  photoContainer: {
    position: 'relative',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
    padding: 2,
  },
  previewIconOverlay: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
    padding: 2,
  },
});

export default TradeScreen; 