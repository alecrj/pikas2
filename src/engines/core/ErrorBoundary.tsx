// import React from 'react';
// import { View, Text, Pressable, StyleSheet } from 'react-native';
// import { errorHandler } from './ErrorHandler';

// interface ErrorBoundaryState {
//   hasError: boolean;
//   error?: Error;
// }

// interface ErrorBoundaryProps {
//   children: React.ReactNode;
//   fallback?: React.ComponentType<{ error?: Error; retry: () => void }>;
// }

// /**
//  * Error boundary component for React error handling
//  * Catches JavaScript errors anywhere in the child component tree
//  */
// export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
//   constructor(props: ErrorBoundaryProps) {
//     super(props);
//     this.state = { hasError: false };
//   }

//   static getDerivedStateFromError(error: Error): ErrorBoundaryState {
//     return { hasError: true, error };
//   }

//   componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
//     errorHandler.handleError({
//       code: 'REACT_ERROR_BOUNDARY',
//       message: error.message,
//       severity: 'high',
//       context: {
//         componentStack: errorInfo.componentStack,
//         error: error.toString(),
//       },
//       timestamp: new Date(),
//     });
//   }

//   retry = () => {
//     this.setState({ hasError: false, error: undefined });
//   };

//   render() {
//     if (this.state.hasError) {
//       if (this.props.fallback) {
//         const FallbackComponent = this.props.fallback;
//         return <FallbackComponent error={this.state.error} retry={this.retry} />;
//       }

//       return (
//         <View style={styles.container}>
//           <Text style={styles.title}>Something went wrong</Text>
//           <Text style={styles.message}>We've logged this error and are working on it.</Text>
//           <Pressable style={styles.button} onPress={this.retry}>
//             <Text style={styles.buttonText}>Try Again</Text>
//           </Pressable>
//         </View>
//       );
//     }

//     return this.props.children;
//   }
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//   },
//   title: {
//     fontSize: 20,
//     fontWeight: '600',
//     marginBottom: 10,
//   },
//   message: {
//     fontSize: 16,
//     color: '#666',
//     textAlign: 'center',
//     marginBottom: 20,
//   },
//   button: {
//     backgroundColor: '#6366F1',
//     paddingHorizontal: 20,
//     paddingVertical: 10,
//     borderRadius: 8,
//   },
//   buttonText: {
//     color: '#FFFFFF',
//     fontSize: 16,
//     fontWeight: '500',
//   },
// });

// /**
//  * HOC to wrap components with error boundary
//  */
// export const withErrorBoundary = <P extends object>(
//   Component: React.ComponentType<P>,
//   fallback?: React.ComponentType<{ error?: Error; retry: () => void }>
// ) => {
//   return (props: P) => (
//     <ErrorBoundary fallback={fallback}>
//       <Component {...props} />
//     </ErrorBoundary>
//   );
// };
