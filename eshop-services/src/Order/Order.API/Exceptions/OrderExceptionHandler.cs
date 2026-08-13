using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace OrderService.Exceptions
{
    // Mismo patron que BuildingBlocks.Exceptions.Handler.CustomExceptionHandler (usado
    // por Catalog.API/Basket.API), extendido con el caso InvalidOrderTransitionException -> 409.
    public class OrderExceptionHandler(ILogger<OrderExceptionHandler> logger) : IExceptionHandler
    {
        public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken cancellationToken)
        {
            logger.LogError("Error Message: {ExceptionMessage}, Time: {Time}", exception.Message, DateTime.UtcNow);

            (string Detail, string Title, int StatusCode) details = exception switch
            {
                InvalidOrderTransitionException => (
                    exception.Message,
                    exception.GetType().Name,
                    context.Response.StatusCode = StatusCodes.Status409Conflict),

                ValidationException => (
                    exception.Message,
                    exception.GetType().Name,
                    context.Response.StatusCode = StatusCodes.Status400BadRequest),

                BadRequestException => (
                    exception.Message,
                    exception.GetType().Name,
                    context.Response.StatusCode = StatusCodes.Status400BadRequest),

                NotFoundException => (
                    exception.Message,
                    exception.GetType().Name,
                    context.Response.StatusCode = StatusCodes.Status404NotFound),

                InternalServerException => (
                    exception.Message,
                    exception.GetType().Name,
                    context.Response.StatusCode = StatusCodes.Status500InternalServerError),

                // Excepcion no controlada (ej. MongoDB no disponible) - nunca se expone el mensaje
                // real ni el stack trace al cliente, solo se registra en el log del servidor.
                _ => (
                    "Ocurrio un error inesperado. Intenta de nuevo mas tarde.",
                    "InternalServerError",
                    context.Response.StatusCode = StatusCodes.Status500InternalServerError),
            };

            var problemDetails = new ProblemDetails
            {
                Title = details.Title,
                Detail = details.Detail,
                Status = details.StatusCode,
                Instance = context.Request.Path,
            };

            problemDetails.Extensions.Add("traceId", context.TraceIdentifier);
            if (exception is ValidationException validationException)
                problemDetails.Extensions.Add("errors", validationException.Errors);

            await context.Response.WriteAsJsonAsync(problemDetails, cancellationToken);
            return true;
        }
    }
}
