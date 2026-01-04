// Redux Cart Screen / Redux 쇼핑 카트 화면
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  addItem,
  increaseQuantity,
  decreaseQuantity,
  removeItem,
} from '../../store/redux/slices/cartSlice';
import type { RootState } from '../../store/redux/store';
import type { CartItem } from '../../store/redux/slices/cartSlice';

export default function ReduxCartScreen() {
  const items = useSelector((state: RootState) => state.cart.items);
  const dispatch = useDispatch();
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleAddItem = () => {
    const price = parseFloat(itemPrice);
    if (itemName.trim() && !isNaN(price) && price > 0) {
      dispatch(addItem({ name: itemName, price }));
      setItemName('');
      setItemPrice('');
    }
  };

  const renderItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
      </View>
      <View style={styles.quantityContainer}>
        <Button
          title="-"
          onPress={() => dispatch(decreaseQuantity(item.id))}
        />
        <Text style={styles.quantity}>{item.quantity}</Text>
        <Button
          title="+"
          onPress={() => dispatch(increaseQuantity(item.id))}
        />
      </View>
      <Button
        title="Remove"
        onPress={() => dispatch(removeItem(item.id))}
        color="#ff4444"
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Redux Shopping Cart</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={itemName}
          onChangeText={setItemName}
          placeholder="Item name"
        />
        <TextInput
          style={styles.input}
          value={itemPrice}
          onChangeText={setItemPrice}
          placeholder="Price"
          keyboardType="numeric"
        />
        <Button title="Add Item" onPress={handleAddItem} />
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
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
});


