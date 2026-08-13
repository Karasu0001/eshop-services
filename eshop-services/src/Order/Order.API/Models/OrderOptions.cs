namespace OrderService.Models
{
    // Se enlaza desde la seccion "Order" de configuracion (Order__TaxRate=0.16, etc).
    public class OrderOptions
    {
        public double TaxRate { get; set; } = 0.16;
    }
}
