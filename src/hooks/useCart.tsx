import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

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
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);
      const productExists = cart.find(product => product.id === productId);
      
      if (!productExists) {
        const { data: product } = await api.get<Product>(`/products/${productId}`);
        if (stock.amount > 0) {
          setCart([...cart, {...product, amount: 1}]);
          localStorage.setItem('@RocketShoes:cart', 
            JSON.stringify([...cart, {...product, amount: 1}])
          );
          return;
        }
      }

      if (productExists) {
        const amount = productExists.amount + 1;

        if (amount > stock.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
        updateProductAmount({productId, amount})
      }
      } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.find(product => product.id === productId);
      if (!productExists) {
        toast.error('Erro na remoção do produto');
        return;
      }
      
      const removeFromCart = cart.filter(productItem => productItem.id !== productId);
      setCart(removeFromCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(removeFromCart));  
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const productExists = cart.find(product => product.id === productId)
      if(!productExists) {
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }

      const {data: stock} = await api.get<Stock>(`/stock/${productId}`);

      if (amount < 1) {
        toast.error('Erro na alteração de quantidade do produto');
        return;
      };

      const stockAmount = stock.amount;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCardList = cart.map(product => 
        product.id === productId ? { ...product, amount } : product);

      setCart(updatedCardList);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCardList));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
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
