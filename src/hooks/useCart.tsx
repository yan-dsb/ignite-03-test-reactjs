import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
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
  removeProduct: (productId: number) => Promise<void>;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => Promise<void>;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });


  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart;
  });

  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
      const product = cart.find(product => product.id === productId);

      const response = await api.get<Stock>(`/stock/${productId}`)

      const productInStock = response.data
      
      let newAmount = product ? product.amount : 0;

      newAmount += 1;

      if(newAmount > productInStock.amount) {
        toast.error('Quantidade solicitada fora de estoque')
        return;
      }


      if(product) {
        setCart(prevState => {
          const newState = prevState
          const productIndex = cart.findIndex(product => product.id === productId);
          newState[productIndex].amount += 1;
          return [...newState]
        })
      }else{
        const responseProduct = await api.get<Product>(`/products/${productId}`)
        setCart(prevState => [...prevState, { ...responseProduct.data, amount: 1 }])
      }      
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const product = cart.find(product => product.id === productId);

      if(!product){
        throw Error('Erro na remoção do produto')
      }       
      setCart(prevState => {
        const newState = prevState.filter(product => product.id !== productId);
        return [...newState]
      })
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      const product = cart.find(product => product.id === productId);

      const response = await api.get<Stock>(`/stock/${productId}`)

      const productInStock = response.data
      
      let newAmount = product ? product.amount : 0;

      newAmount += 1;

      if(newAmount > productInStock.amount) {
        toast.error('Quantidade solicitada fora de estoque')
        return;
      }

      const productIndex = cart.findIndex(product => product.id === productId);

      if(productIndex >= 0) {
        setCart(prevState => {
          const newState = prevState
          newState[productIndex].amount = amount;
          return [...newState]
        })
      }else{
        const responseProduct = await api.get<Product>(`/products/${productId}`)
        setCart(prevState => {
          const newState = [...prevState, { ...responseProduct.data, amount }]
          return newState
        })
      }
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
