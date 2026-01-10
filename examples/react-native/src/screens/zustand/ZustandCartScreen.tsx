// Zustand Cart Screen / Zustand 쇼핑 카트 화면
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import useCartStore from '../../store/zustand/useCartStore';
import type { CartItem } from '../../store/zustand/useCartStore';

// Random item names / 랜덤 아이템 이름
const ITEM_NAMES = [
  'Apple',
  'Banana',
  'Orange',
  'Grapes',
  'Strawberry',
  'Watermelon',
  'Pineapple',
  'Mango',
  'Kiwi',
  'Peach',
  'Cherry',
  'Blueberry',
  'Raspberry',
  'Blackberry',
  'Papaya',
];

// Generate random item / 랜덤 아이템 생성
const generateRandomItem = () => {
  const randomName = ITEM_NAMES[Math.floor(Math.random() * ITEM_NAMES.length)];
  const randomPrice = Math.round((Math.random() * 50 + 1) * 100) / 100; // $1.00 - $50.00
  return { name: randomName, price: randomPrice };
};

export default function ZustandCartScreen() {
  // Subscribe to entire store to ensure re-rendering / 리렌더링을 보장하기 위해 전체 store 구독
  const store = useCartStore();
  const { items, addItem, increaseQuantity, decreaseQuantity, removeItem, getTotal } = store;

  const total = getTotal();

  // Debug: Log items changes / 디버그: items 변경 로그
  React.useEffect(() => {
    console.log('[ZustandCartScreen] items changed:', items);
    console.log('[ZustandCartScreen] items length:', items.length);
    console.log('[ZustandCartScreen] store state:', useCartStore.getState());
  }, [items]);

  const handleAddItem = () => {
    const { name, price } = generateRandomItem();
    addItem(name, price);
  };

  const renderItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
      </View>
      <View style={styles.quantityContainer}>
        <TouchableOpacity style={styles.quantityButton} onPress={() => decreaseQuantity(item.id)}>
          <Text style={styles.quantityButtonText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.quantity}>{item.quantity}</Text>
        <TouchableOpacity style={styles.quantityButton} onPress={() => increaseQuantity(item.id)}>
          <Text style={styles.quantityButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.removeButton} onPress={() => removeItem(item.id)}>
        <Text style={styles.removeButtonText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
          <Text style={styles.addButtonText}>Add Random Item</Text>
        </TouchableOpacity>
      </View>
      {/* Debug: Show items count / 디버그: items 개수 표시 */}
      <Text style={styles.debugText}>Items count: {items.length}</Text>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={items.length === 0 ? styles.emptyList : styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No items in cart</Text>
          </View>
        }
        extraData={items.length}
      />
      <View style={styles.totalContainer}>
        <Text style={styles.totalText}>Total: ${total.toFixed(2)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 10,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  debugText: {
    fontSize: 12,
    color: '#ff0000',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
    gap: 10,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quantity: {
    fontSize: 16,
    minWidth: 30,
    textAlign: 'center',
  },
  totalContainer: {
    padding: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    marginTop: 10,
  },
  totalText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  quantityButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  quantityButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  removeButton: {
    backgroundColor: '#ff4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
