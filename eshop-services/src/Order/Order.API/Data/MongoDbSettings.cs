namespace OrderService.Data
{
    // Se enlaza desde la seccion "MongoDb" de configuracion (appsettings.json /
    // variables de entorno MongoDb__ConnectionString, MongoDb__DatabaseName).
    public class MongoDbSettings
    {
        public string ConnectionString { get; set; } = default!;
        public string DatabaseName { get; set; } = default!;
        public string OrdersCollectionName { get; set; } = "orders";
    }
}
