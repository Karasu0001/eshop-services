namespace OrderService.Exceptions
{
    // Se lanza cuando se pide un cambio de estado no permitido (ej. Cancelled -> Confirmed).
    // Mapea a 409 Conflict, distinto de una simple validacion de formato (400).
    public class InvalidOrderTransitionException : Exception
    {
        public InvalidOrderTransitionException(string message) : base(message)
        {
        }
    }
}
