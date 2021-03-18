import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const localStorageId = '@RocketShoes:cart';
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(localStorageId);
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const stockAmount = await api.get(`stock/${productId}`).then(response => response.data.amount).catch(_ => { throw new Error('Erro na adição do produto') });
      const productIndexInCart = cart.findIndex(cartProduct => cartProduct.id === productId);
      if (productIndexInCart >= 0) {
        const newAmount = cart[productIndexInCart].amount + 1;
        if (newAmount > stockAmount) {
          throw new Error('Quantidade solicitada fora de estoque');
        }
        const newCart = [...cart];
        const product = newCart.splice(productIndexInCart, 1);
        setCart([...newCart, { ...product[0], amount: newAmount }]);
        localStorage.setItem(localStorageId, JSON.stringify([...newCart, { ...product[0], amount: newAmount }]));
      } else {
        const product = await api.get(`products/${productId}`).then(response => response.data).catch(err => { throw new Error('Erro na adição do produto') });
        setCart([...cart, { ...product, amount: 1 }]);
        localStorage.setItem(localStorageId, JSON.stringify([...cart, { ...product, amount: 1 }]));
      }
    } catch ({message}) {
      toast.error(message);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIndexInCart = cart.findIndex(cartProduct => cartProduct.id === productId);
      if (productIndexInCart >= 0) {
        const newCart = [...cart];
        newCart.splice(productIndexInCart, 1);
        setCart([...newCart]);
        localStorage.setItem(localStorageId, JSON.stringify([...newCart]));
      } else throw new Error('Erro na remoção do produto');
    } catch ({ message }) {
      toast.error(message);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) throw new Error('Erro na alteração de quantidade do produto');
      const stockAmount = await api.get(`stock/${productId}`).then(response => response.data.amount).catch(_ => { throw new Error('Erro na alteração de quantidade do produto')});
      if (stockAmount < amount) throw new Error('Quantidade solicitada fora de estoque');
      const productIndexInCart = cart.findIndex(cartProduct => cartProduct.id === productId);
      if (productIndexInCart < 0) throw new Error('Erro na alteração de quantidade do produto');
      const newCart = [...cart];
      const product = newCart.splice(productIndexInCart, 1);
      setCart([...newCart, {...product[0], amount: amount}]);
      localStorage.setItem(localStorageId, JSON.stringify([...newCart, { ...product[0], amount }]));
    } catch ({ message }) {
      toast.error(message);
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
