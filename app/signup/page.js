"use client";
import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { 
  Box, 
  Button, 
  Container, 
  Flex, 
  Heading, 
  Input, 
  Text, 
  VStack, 
  HStack,
  Divider,
  useToast,
  Icon,
  Checkbox
} from '@chakra-ui/react';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub } from 'react-icons/fa';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast({
        title: "Hata",
        description: "Lütfen tüm alanları doldurun.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setIsLoading(true);
    
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Kayıt başarısız.');
      }

      toast({
        title: "Kayıt Başarılı",
        description: "Giriş yapılıyor...",
        status: "success",
        duration: 2000,
        isClosable: true,
      });

      // Automatically sign in after signup
      await signIn('credentials', {
        redirect: true,
        callbackUrl: '/chat',
        email,
        password,
      });

    } catch (error) {
      toast({
        title: "Hata",
        description: error.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    signIn(provider, { callbackUrl: '/chat' });
  };

  return (
    <Flex 
      minH="100vh" 
      align="center" 
      justify="center" 
      bg="#030308" 
      position="relative" 
      overflow="hidden"
      fontFamily="'Inter', sans-serif"
    >
      {/* Background Glows */}
      <Box 
        position="absolute" top="-100px" right="-100px" w="500px" h="500px" 
        bg="radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)" 
        borderRadius="full" pointerEvents="none" 
      />
      <Box 
        position="absolute" bottom="-100px" left="-100px" w="500px" h="500px" 
        bg="radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)" 
        borderRadius="full" pointerEvents="none" 
      />

      <Container maxW="md" zIndex={1} py={10}>
        <VStack spacing={8} align="stretch" className="animate-scale-in">
          <VStack spacing={2} textAlign="center">
            <Box 
              w="64px" h="64px" borderRadius="18px" 
              bg="linear-gradient(135deg, #06b6d4, #3b82f6)" 
              display="flex" align="center" justify="center" fontSize="32px"
              boxShadow="0 8px 32px rgba(6,182,212,0.4)"
              mb={2}
            >✨</Box>
            <Heading color="#f0f0ff" fontSize="32px" fontWeight="900" letterSpacing="-1px">
              Yeni Bir Başlangıç
            </Heading>
            <Text color="rgba(160,160,192,0.7)" fontSize="16px" fontWeight="500">
              Kişisel gelişim yolculuğuna bugün katıl.
            </Text>
          </VStack>

          <Box 
            p={8} borderRadius="24px" 
            bg="rgba(18, 18, 31, 0.75)" 
            backdropFilter="blur(40px)"
            border="1px solid rgba(6,182,212,0.15)"
            boxShadow="0 20px 60px rgba(0,0,0,0.5)"
          >
            <VStack spacing={4} as="form" onSubmit={handleSignup}>
              <VStack spacing={4} w="100%" align="start">
                <Text color="#a5b4fc" fontSize="13px" fontWeight="700" letterSpacing="0.5px" textTransform="uppercase">
                  Ad Soyad
                </Text>
                <Input 
                  placeholder="John Doe"
                  bg="rgba(12,12,24,0.6)"
                  border="1px solid rgba(6,182,212,0.2)"
                  borderRadius="14px"
                  color="white"
                  _placeholder={{ color: 'rgba(160,160,192,0.4)' }}
                  _hover={{ borderColor: 'rgba(6,182,212,0.4)' }}
                  _focus={{ borderColor: '#06b6d4', boxShadow: '0 0 0 1px #06b6d4' }}
                  h="50px"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </VStack>

              <VStack spacing={4} w="100%" align="start">
                <Text color="#a5b4fc" fontSize="13px" fontWeight="700" letterSpacing="0.5px" textTransform="uppercase">
                  Email Adresi
                </Text>
                <Input 
                  placeholder="name@example.com"
                  bg="rgba(12,12,24,0.6)"
                  border="1px solid rgba(6,182,212,0.2)"
                  borderRadius="14px"
                  color="white"
                  _placeholder={{ color: 'rgba(160,160,192,0.4)' }}
                  _hover={{ borderColor: 'rgba(6,182,212,0.4)' }}
                  _focus={{ borderColor: '#06b6d4', boxShadow: '0 0 0 1px #06b6d4' }}
                  h="50px"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </VStack>

              <VStack spacing={4} w="100%" align="start">
                <Text color="#a5b4fc" fontSize="13px" fontWeight="700" letterSpacing="0.5px" textTransform="uppercase">
                  Şifre Oluştur
                </Text>
                <Input 
                  type="password"
                  placeholder="••••••••"
                  bg="rgba(12,12,24,0.6)"
                  border="1px solid rgba(6,182,212,0.2)"
                  borderRadius="14px"
                  color="white"
                  _placeholder={{ color: 'rgba(160,160,192,0.4)' }}
                  _hover={{ borderColor: 'rgba(6,182,212,0.4)' }}
                  _focus={{ borderColor: '#06b6d4', boxShadow: '0 0 0 1px #06b6d4' }}
                  h="50px"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </VStack>

              <HStack w="100%" py={2}>
                <Checkbox colorScheme="blue" defaultChecked iconColor="white">
                  <Text fontSize="12px" color="rgba(160,160,192,0.6)">
                    Kullanım koşullarını ve gizlilik politikasını kabul ediyorum.
                  </Text>
                </Checkbox>
              </HStack>

              <Button 
                type="submit"
                w="100%" h="54px" mt={2}
                bg="linear-gradient(135deg, #06b6d4, #3b82f6)"
                color="white"
                borderRadius="14px"
                fontSize="16px" fontWeight="700"
                _hover={{ transform: 'translateY(-2px)', boxShadow: '0 8px 32px rgba(6,182,212,0.4)' }}
                _active={{ transform: 'translateY(0)' }}
                isLoading={isLoading}
              >
                Kayıt Ol
              </Button>

              <HStack w="100%" py={2}>
                <Divider borderColor="rgba(99,102,241,0.15)" />
                <Text fontSize="12px" color="rgba(160,160,192,0.5)" fontWeight="700" whiteSpace="nowrap" px={2}>
                  VEYA
                </Text>
                <Divider borderColor="rgba(99,102,241,0.15)" />
              </HStack>

              <VStack w="100%" spacing={3}>
                <Button 
                  w="100%" h="50px"
                  bg="rgba(255,255,255,0.03)"
                  border="1px solid rgba(255,255,255,0.08)"
                  color="white"
                  borderRadius="14px"
                  fontSize="14px" fontWeight="600"
                  leftIcon={<Icon as={FcGoogle} boxSize={5} />}
                  _hover={{ bg: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.2)' }}
                  onClick={() => handleSocialLogin('google')}
                >
                  Google ile Kayıt Ol
                </Button>
              </VStack>
            </VStack>
          </Box>

          <Text textAlign="center" color="rgba(160,160,192,0.6)" fontSize="14px">
            Zaten hesabın var mı?{' '}
            <Link href="/login">
              <Text as="span" color="#06b6d4" fontWeight="700" cursor="pointer" _hover={{ textDecoration: 'underline' }}>
                Giriş Yap
              </Text>
            </Link>
          </Text>
        </VStack>
      </Container>
    </Flex>
  );
}
