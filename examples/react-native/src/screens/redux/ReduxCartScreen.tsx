// Redux Cart Screen / Redux 쇼핑 카트 화면
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  addItem,
  increaseQuantity,
  decreaseQuantity,
  removeItem,
} from '../../store/redux/slices/cartSlice';
import type { RootState } from '../../store/redux/store';
import type { CartItem } from '../../store/redux/slices/cartSlice';

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

export default function ReduxCartScreen() {
  const items = useSelector((state: RootState) => state.cart.items);
  const dispatch = useDispatch();

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleAddItem = () => {
    const { name, price } = generateRandomItem();
    dispatch(addItem({ name, price }));
  };

  const renderItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
      </View>
      <View style={styles.quantityContainer}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => dispatch(decreaseQuantity(item.id))}
        >
          <Text style={styles.quantityButtonText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.quantity}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => dispatch(increaseQuantity(item.id))}
        >
          <Text style={styles.quantityButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.removeButton} onPress={() => dispatch(removeItem(item.id))}>
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
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
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
