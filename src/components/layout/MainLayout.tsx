/**
 * MainLayout - Layout principal moderno com Chakra UI v3
 */
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Flex, useBreakpointValue } from '@chakra-ui/react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useBreakpointValue({ base: true, lg: false });

  return (
    <Flex minH="100vh" bg="bg.secondary" color="fg.primary">
      {/* Overlay para mobile */}
      {sidebarOpen && isMobile && (
        <Box
          position="fixed"
          inset={0}
          bg="blackAlpha.600"
          zIndex={30}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Mobile */}
      <Box
        position="fixed"
        left={0}
        top={0}
        bottom={0}
        width="280px"
        zIndex={40}
        transform={sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'}
        transition="transform 0.3s ease-in-out"
        display={{ base: 'block', lg: 'none' }}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </Box>

      {/* Sidebar Desktop */}
      <Box
        width="280px"
        flexShrink={0}
        display={{ base: 'none', lg: 'block' }}
      >
        <Sidebar />
      </Box>

      {/* Main Content */}
      <Flex flex={1} flexDirection="column" overflow="hidden">
        <Header 
          title="Painel Operacional" 
          subtitle="CRM Pastita" 
          onMenuClick={() => setSidebarOpen(true)} 
        />
        <Box 
          as="main" 
          flex={1} 
          overflow="auto"
          bg="bg.secondary"
        >
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  );
};

export default MainLayout;
